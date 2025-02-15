# models.py
from django.db import models
from django.contrib.auth.models import User

class GCPProject(models.Model):
    project_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

class CustomRole(models.Model):
    role_id = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    permissions = models.JSONField()

class ProjectAccess(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(GCPProject, on_delete=models.CASCADE)
    role = models.ForeignKey(CustomRole, on_delete=models.CASCADE)
    granted_by = models.ForeignKey(User, related_name='access_granted_by', on_delete=models.SET_NULL, null=True)
    granted_at = models.DateTimeField(auto_now_add=True)

class APIAccess(models.Model):
    api_name = models.CharField(max_length=200)
    project = models.ForeignKey(GCPProject, on_delete=models.CASCADE)
    enabled = models.BooleanField(default=False)
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    last_modified_at = models.DateTimeField(auto_now=True)

class AccessRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('DENIED', 'Denied')
    ]
    
    requester = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(GCPProject, on_delete=models.CASCADE)
    role = models.ForeignKey(CustomRole, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey(User, related_name='requests_processed_by', on_delete=models.SET_NULL, null=True)
    processed_at = models.DateTimeField(null=True)

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('GRANT', 'Grant Access'),
        ('REVOKE', 'Revoke Access'),
        ('MODIFY', 'Modify Access'),
        ('API_ENABLE', 'Enable API'),
        ('API_DISABLE', 'Disable API')
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    project = models.ForeignKey(GCPProject, on_delete=models.CASCADE)
    details = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True)

# views.py
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from google.oauth2 import service_account
from googleapiclient import discovery

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = GCPProject.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def grant_access(self, request, pk=None):
        project = self.get_object()
        user_email = request.data.get('user_email')
        role_id = request.data.get('role_id')

        # Initialize GCP IAM API
        credentials = service_account.Credentials.from_service_account_file(
            'path/to/service-account.json',
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        service = discovery.build('iam', 'v1', credentials=credentials)

        try:
            # Grant IAM role in GCP
            policy = service.projects().getIamPolicy(
                resource=f'projects/{project.project_id}'
            ).execute()

            binding = {
                'role': f'organizations/{settings.ORGANIZATION_ID}/roles/{role_id}',
                'members': [f'user:{user_email}']
            }
            policy['bindings'].append(binding)

            service.projects().setIamPolicy(
                resource=f'projects/{project.project_id}',
                body={'policy': policy}
            ).execute()

            # Log the action
            AuditLog.objects.create(
                user=request.user,
                action='GRANT',
                project=project,
                details={
                    'user_email': user_email,
                    'role_id': role_id
                }
            )

            return Response({'status': 'success'})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=400)

class APIAccessViewSet(viewsets.ModelViewSet):
    queryset = APIAccess.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def toggle_api(self, request, pk=None):
        api_access = self.get_object()
        enabled = request.data.get('enabled', False)

        credentials = service_account.Credentials.from_service_account_file(
            'path/to/service-account.json',
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        service = discovery.build('serviceusage', 'v1', credentials=credentials)

        try:
            if enabled:
                service.services().enable(
                    name=f'projects/{api_access.project.project_id}/services/{api_access.api_name}'
                ).execute()
            else:
                service.services().disable(
                    name=f'projects/{api_access.project.project_id}/services/{api_access.api_name}'
                ).execute()

            api_access.enabled = enabled
            api_access.last_modified_by = request.user
            api_access.save()

            AuditLog.objects.create(
                user=request.user,
                action='API_ENABLE' if enabled else 'API_DISABLE',
                project=api_access.project,
                details={'api_name': api_access.api_name}
            )

            return Response({'status': 'success'})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=400)

# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet)
router.register(r'api-access', views.APIAccessViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
# models.py
from django.db import models
from django.contrib.auth.models import User
import ipaddress

class CIDRBlock(models.Model):
    ENVIRONMENT_CHOICES = [
        ('PROD', 'Production'),
        ('DEV', 'Development'),
        ('STAGING', 'Staging')
    ]
    
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('RESERVED', 'Reserved'),
        ('IN_USE', 'In Use')
    ]
    
    cidr_range = models.CharField(max_length=18)  # e.g., "10.0.0.0/24"
    environment = models.CharField(max_length=10, choices=ENVIRONMENT_CHOICES)
    region = models.CharField(max_length=50)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='AVAILABLE')
    description = models.TextField(blank=True)
    assigned_to = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Validate CIDR notation
        try:
            ipaddress.ip_network(self.cidr_range)
        except ValueError:
            raise ValidationError("Invalid CIDR range")

class IPRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected')
    ]
    
    requester = models.ForeignKey(User, on_delete=models.CASCADE)
    application_name = models.CharField(max_length=200)
    environment = models.CharField(max_length=10, choices=CIDRBlock.ENVIRONMENT_CHOICES)
    region = models.CharField(max_length=50)
    subnet_size = models.IntegerField()  # Size needed (in CIDR notation, e.g., 24 for /24)
    purpose = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    assigned_cidr = models.ForeignKey(CIDRBlock, null=True, blank=True, on_delete=models.SET_NULL)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        User, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name='processed_requests'
    )

class IPAuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create CIDR Block'),
        ('UPDATE', 'Update CIDR Block'),
        ('DELETE', 'Delete CIDR Block'),
        ('REQUEST', 'IP Range Request'),
        ('APPROVE', 'Approve Request'),
        ('REJECT', 'Reject Request')
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    details = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True)

# views.py
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

class CIDRBlockViewSet(viewsets.ModelViewSet):
    queryset = CIDRBlock.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        instance = serializer.save()
        IPAuditLog.objects.create(
            user=self.request.user,
            action='CREATE',
            details={
                'cidr_range': instance.cidr_range,
                'environment': instance.environment
            }
        )

    @action(detail=True, methods=['post'])
    def reserve(self, request, pk=None):
        cidr_block = self.get_object()
        cidr_block.status = 'RESERVED'
        cidr_block.assigned_to = request.data.get('assigned_to')
        cidr_block.save()
        
        IPAuditLog.objects.create(
            user=request.user,
            action='UPDATE',
            details={
                'cidr_range': cidr_block.cidr_range,
                'status': 'RESERVED',
                'assigned_to': cidr_block.assigned_to
            }
        )
        
        return Response({'status': 'success'})

class IPRequestViewSet(viewsets.ModelViewSet):
    queryset = IPRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)
        IPAuditLog.objects.create(
            user=self.request.user,
            action='REQUEST',
            details=serializer.data
        )

    @action(detail=True, methods=['post'])
    def process_request(self, request, pk=None):
        ip_request = self.get_object()
        action = request.data.get('action')
        cidr_block_id = request.data.get('cidr_block_id')
        
        if action not in ['APPROVE', 'REJECT']:
            return Response({'error': 'Invalid action'}, status=400)
            
        ip_request.status = 'APPROVED' if action == 'APPROVE' else 'REJECTED'
        ip_request.processed_by = request.user
        ip_request.processed_at = timezone.now()
        
        if action == 'APPROVE' and cidr_block_id:
            cidr_block = CIDRBlock.objects.get(id=cidr_block_id)
            ip_request.assigned_cidr = cidr_block
            cidr_block.status = 'IN_USE'
            cidr_block.assigned_to = ip_request.application_name
            cidr_block.save()
            
        ip_request.save()
        
        IPAuditLog.objects.create(
            user=request.user,
            action=action,
            details={
                'request_id': ip_request.id,
                'application': ip_request.application_name,
                'assigned_cidr': cidr_block.cidr_range if action == 'APPROVE' and cidr_block_id else None
            }
        )
        
        return Response({'status': 'success'})

# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'cidr-blocks', views.CIDRBlockViewSet)
router.register(r'ip-requests', views.IPRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
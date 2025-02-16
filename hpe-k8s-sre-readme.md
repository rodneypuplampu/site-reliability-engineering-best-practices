# HPE SRE Example Cloud User Portal Deployment

This repository contains the Kubernetes configurations and deployment instructions for the User Portal application, featuring a Django backend, PostgreSQL database, and frontend served through HPE Cloud CDN.

## Architecture Overview

The application consists of three main components:
- Frontend application served via HPE Cloud CDN
- Django backend application running in containers
- PostgreSQL database deployed as a StatefulSet

## Prerequisites

- Access to HPE Kubernetes cluster
- `kubectl` CLI configured with cluster access
- Docker installed for container builds
- Helm v3.x installed

## Repository Structure

```
.
├── k8s/
│   ├── userportal/
│   │   ├── frontend/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── ingress.yaml
│   │   ├── backend/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── configmap.yaml
│   │   └── database/
│   │       ├── statefulset.yaml
│   │       ├── service.yaml
│   │       └── pvc.yaml
│   └── namespace.yaml
├── src/
│   ├── frontend/
│   │   └── Dockerfile
│   └── backend/
│       └── Dockerfile
└── helm/
    └── values.yaml
```

## Deployment Instructions

### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Deploy PostgreSQL StatefulSet

The PostgreSQL database is deployed as a StatefulSet to ensure stable network identities and persistent storage.

```bash
kubectl apply -f k8s/userportal/database/
```

### 3. Deploy Django Backend

```bash
# Create ConfigMap for Django settings
kubectl apply -f k8s/userportal/backend/configmap.yaml

# Deploy Django application
kubectl apply -f k8s/userportal/backend/deployment.yaml
kubectl apply -f k8s/userportal/backend/service.yaml
```

### 4. Deploy Frontend

```bash
# Deploy frontend application
kubectl apply -f k8s/userportal/frontend/deployment.yaml
kubectl apply -f k8s/userportal/frontend/service.yaml
kubectl apply -f k8s/userportal/frontend/ingress.yaml
```

## Configuration Details

### PostgreSQL StatefulSet

- Replica count: 1
- Storage: Dynamic provisioning using default StorageClass
- Data persistence: PVC with ReadWriteOnce access mode

### Django Backend

- Replica count: 3
- Health checks: Liveness and readiness probes configured
- Environment variables: Loaded from ConfigMap
- Database connection: Using Kubernetes service DNS

### Frontend

- Served through HPE Cloud CDN
- Cached static assets
- SSL termination at CDN level

## Monitoring and Logging

- Application logs available through `kubectl logs`
- Metrics exposed for Prometheus scraping
- HPE Cloud monitoring integration enabled

## Security Considerations

- Network policies implemented for pod-to-pod communication
- Secrets management using Kubernetes Secrets
- TLS encryption for all external traffic
- Regular security scanning of container images

## Scaling

### Horizontal Scaling

```bash
# Scale Django backend
kubectl scale deployment django-backend -n userportal --replicas=5

# Scale frontend
kubectl scale deployment frontend -n userportal --replicas=3
```

### Vertical Scaling

Resource requests and limits can be adjusted in the respective deployment manifests.

## Backup and Recovery

### Database Backup

```bash
# Create backup
kubectl exec postgresql-0 -n userportal -- pg_dump -U postgres userportal > backup.sql

# Restore from backup
kubectl exec -i postgresql-0 -n userportal -- psql -U postgres userportal < backup.sql
```

## Troubleshooting

### Common Issues

1. Database connection failures
```bash
kubectl logs deployment/django-backend -n userportal
kubectl describe pod postgresql-0 -n userportal
```

2. CDN caching issues
- Clear CDN cache through HPE Cloud Console
- Verify CDN configuration settings

### Health Checks

```bash
# Check pod status
kubectl get pods -n userportal

# Check services
kubectl get services -n userportal

# Check ingress
kubectl get ingress -n userportal
```

## Maintenance

### Regular Tasks

- Monitor resource usage
- Update security patches
- Backup database regularly
- Review CDN cache settings
- Check application logs for errors

### Updates

1. Backend updates:
```bash
kubectl set image deployment/django-backend django-backend=newimage:tag -n userportal
```

2. Frontend updates:
```bash
kubectl set image deployment/frontend frontend=newimage:tag -n userportal
```

## Contact

For issues or questions, please contact the DevOps team at devops@company.com

## License

Copyright (c) 2025 Your Company Name. All rights reserved.

# Oracle SRE Example User Portal Deployment

This repository contains the deployment configuration for a cloud-native user portal application using Oracle Cloud Infrastructure (OCI), Oracle Kubernetes Engine (OKE), and Oracle Cloud Content Delivery Network (CDN).

## Architecture Overview

- Frontend: React application served through Oracle Cloud CDN
- Backend: Django REST API containerized application
- Database: PostgreSQL with StatefulSet deployment
- Infrastructure: Oracle Kubernetes Engine (OKE)
- Namespace: userportal

## Prerequisites

- Oracle Cloud Infrastructure (OCI) account with appropriate permissions
- Oracle Cloud CLI installed and configured
- kubectl installed and configured
- Docker installed (for local development)
- Helm 3.x installed

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
├── frontend/
│   └── Dockerfile
├── backend/
│   └── Dockerfile
└── cdn/
    └── cdn-config.yaml
```

## Deployment Steps

### 1. Database Setup

Deploy PostgreSQL StatefulSet:

```bash
# Create userportal namespace
kubectl create namespace userportal

# Apply PostgreSQL configuration
kubectl apply -f k8s/userportal/database/statefulset.yaml
kubectl apply -f k8s/userportal/database/service.yaml
kubectl apply -f k8s/userportal/database/pvc.yaml
```

### 2. Backend Deployment

Deploy Django application:

```bash
# Build and push Docker image
docker build -t <registry>/userportal-backend:latest ./backend
docker push <registry>/userportal-backend:latest

# Deploy backend components
kubectl apply -f k8s/userportal/backend/configmap.yaml
kubectl apply -f k8s/userportal/backend/deployment.yaml
kubectl apply -f k8s/userportal/backend/service.yaml
```

### 3. Frontend Deployment

Deploy React application:

```bash
# Build and push Docker image
docker build -t <registry>/userportal-frontend:latest ./frontend
docker push <registry>/userportal-frontend:latest

# Deploy frontend components
kubectl apply -f k8s/userportal/frontend/deployment.yaml
kubectl apply -f k8s/userportal/frontend/service.yaml
kubectl apply -f k8s/userportal/frontend/ingress.yaml
```

### 4. CDN Configuration

1. Create Oracle Cloud CDN configuration:
```bash
oci cdn origin create --config-name userportal-cdn --origin-name userportal-origin --origin-type PRIMARY --domain <ingress-domain>
```

2. Apply CDN configuration:
```bash
kubectl apply -f cdn/cdn-config.yaml
```

## Environment Configuration

### PostgreSQL StatefulSet

The PostgreSQL StatefulSet configuration includes:
- Persistent volume claims for data persistence
- Replication for high availability
- Automated backups
- Resource limits and requests

Example configuration in `statefulset.yaml`:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: userportal
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

### Django Backend Configuration

Key configurations for the Django backend:
- Environment variables for database connection
- Static file serving configuration
- CORS settings
- Resource limits

### Frontend CDN Configuration

CDN configuration includes:
- Cache rules for static assets
- SSL/TLS configuration
- Origin failover settings
- Custom domain configuration

## Monitoring and Maintenance

### Health Checks

Monitor application health:
```bash
# Check pods status
kubectl get pods -n userportal

# Check services
kubectl get services -n userportal

# Check StatefulSet status
kubectl get statefulset -n userportal
```

### Backup and Recovery

1. Database Backups:
```bash
# Create backup
kubectl exec -n userportal postgres-0 -- pg_dump -U postgres > backup.sql

# Restore from backup
kubectl exec -i -n userportal postgres-0 -- psql -U postgres < backup.sql
```

2. Application Logs:
```bash
# View backend logs
kubectl logs -n userportal deployment/backend

# View frontend logs
kubectl logs -n userportal deployment/frontend
```

## Troubleshooting

Common issues and solutions:

1. Database Connection Issues:
   - Verify PostgreSQL service is running
   - Check database credentials in configmap
   - Verify network policies

2. CDN Cache Issues:
   - Clear CDN cache
   - Verify origin health
   - Check SSL/TLS certificates

3. Kubernetes Pod Issues:
   - Check pod logs
   - Verify resource limits
   - Check image pull policies

## Security Considerations

- All sensitive data stored in Kubernetes secrets
- Network policies implemented for pod-to-pod communication
- Regular security updates for all components
- SSL/TLS encryption for all external communication
- Regular audit logging enabled

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Create pull request

## License

[Add your license information here]

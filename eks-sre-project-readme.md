# AWS SRE Example Userportal App

This project implements a scalable user portal application using AWS Cloud CDN for frontend delivery, PostgreSQL with StatefulSet for persistent storage, and a containerized Django backend running on Amazon EKS (Elastic Kubernetes Service).

## Architecture Overview

- Frontend: Static assets served through AWS CloudFront CDN
- Backend: Django application containerized with Docker
- Database: PostgreSQL deployed as a StatefulSet in Kubernetes
- Infrastructure: Amazon EKS for container orchestration
- Namespace: All components deployed in `userportal` namespace

## Prerequisites

- AWS CLI configured with appropriate permissions
- kubectl installed and configured
- Docker installed for local development
- Helm 3.x installed
- eksctl installed for cluster management

## Project Structure

```
├── frontend/                 # React/Vue frontend application
├── backend/                  # Django application
│   ├── Dockerfile           # Django app containerization
│   └── requirements.txt     # Python dependencies
├── k8s/                     # Kubernetes manifests
│   ├── userportal/         # Namespace-specific configurations
│   ├── postgres/           # PostgreSQL StatefulSet configs
│   └── django/            # Django deployment configs
└── infrastructure/         # Infrastructure as Code
    └── terraform/         # AWS infrastructure setup
```

## Setup Instructions

### 1. AWS Infrastructure Setup

```bash
# Navigate to infrastructure directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Apply infrastructure changes
terraform apply
```

### 2. EKS Cluster Configuration

```bash
# Create EKS cluster
eksctl create cluster -f cluster-config.yaml

# Create userportal namespace
kubectl create namespace userportal
```

### 3. Database Deployment

```bash
# Deploy PostgreSQL StatefulSet
kubectl apply -f k8s/postgres/statefulset.yaml -n userportal
kubectl apply -f k8s/postgres/service.yaml -n userportal
```

### 4. Backend Deployment

```bash
# Build Django container
docker build -t userportal-backend ./backend

# Push to container registry
docker push <your-registry>/userportal-backend:latest

# Deploy Django application
kubectl apply -f k8s/django/ -n userportal
```

### 5. Frontend Deployment

```bash
# Build frontend assets
cd frontend
npm run build

# Deploy to S3 and invalidate CloudFront
aws s3 sync dist/ s3://<your-bucket-name>/
aws cloudfront create-invalidation --distribution-id <your-dist-id> --paths "/*"
```

## Configuration Files

### PostgreSQL StatefulSet Configuration
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: userportal
spec:
  serviceName: postgres
  replicas: 1
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
        volumeMounts:
        - name: postgres-pvc
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-pvc
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: gp2
      resources:
        requests:
          storage: 10Gi
```

### Django Deployment Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: django-app
  namespace: userportal
spec:
  replicas: 3
  selector:
    matchLabels:
      app: django
  template:
    metadata:
      labels:
        app: django
    spec:
      containers:
      - name: django
        image: <your-registry>/userportal-backend:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: url
```

## Monitoring and Maintenance

### Health Checks

Monitor application health using:
```bash
# Check pods status
kubectl get pods -n userportal

# Check StatefulSet status
kubectl describe statefulset postgres -n userportal

# View application logs
kubectl logs -f deployment/django-app -n userportal
```

### Scaling

Scale the application horizontally:
```bash
# Scale Django deployment
kubectl scale deployment django-app --replicas=5 -n userportal
```

## Security Considerations

1. Database credentials stored as Kubernetes secrets
2. Network policies implemented to restrict pod-to-pod communication
3. AWS security groups configured for minimal required access
4. SSL/TLS encryption for all external communication
5. Regular security updates for all components

## Backup and Recovery

### Database Backups

```bash
# Create a backup
kubectl exec -n userportal postgres-0 -- pg_dump -U postgres > backup.sql

# Restore from backup
kubectl exec -i -n userportal postgres-0 -- psql -U postgres < backup.sql
```

## Troubleshooting

Common issues and solutions:

1. **Database Connection Issues**
   - Verify secrets are properly configured
   - Check network policies
   - Ensure service DNS resolution is working

2. **Pod Scheduling Issues**
   - Check node resources
   - Verify PVC binding
   - Review pod events with `kubectl describe pod`

3. **CDN Issues**
   - Check CloudFront distribution status
   - Verify origin configurations
   - Clear cache if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description
4. Ensure all tests pass
5. Wait for review and approval

## License

This project is licensed under the MIT License - see the LICENSE file for details.

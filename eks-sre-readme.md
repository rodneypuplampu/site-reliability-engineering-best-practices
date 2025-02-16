# Cloud Infrastructure Deployment

This repository contains the infrastructure configuration for deploying a Django application with PostgreSQL backend on AKS (Azure Kubernetes Service) and serving the frontend through AWS CloudFront CDN.

## Architecture Overview

- Frontend: Static assets served via AWS CloudFront CDN
- Backend: Django application containerized and deployed on AKS
- Database: PostgreSQL deployed as StatefulSet on AKS
- Namespace: All Kubernetes resources deployed in `userportal` namespace

## Prerequisites

- Azure CLI installed and configured
- AWS CLI installed and configured
- kubectl installed
- Docker installed
- Access to Azure Container Registry (ACR)
- Helm (for PostgreSQL deployment)

## Frontend Deployment (AWS)

### CloudFront Setup

1. Create an S3 bucket for static assets:
```bash
aws s3 mb s3://your-bucket-name --region your-region
```

2. Configure S3 bucket for static website hosting:
```bash
aws s3 website s3://your-bucket-name --index-document index.html
```

3. Create CloudFront distribution:
- Origin: Your S3 bucket
- Behaviors: 
  - Default: /* (cached)
  - /api/*: (not cached, forwarded to backend)
- SSL Certificate: ACM certificate
- Price Class: Select based on geographical needs

### Frontend Build and Deploy

1. Build frontend assets:
```bash
npm run build
```

2. Sync built assets to S3:
```bash
aws s3 sync ./build s3://your-bucket-name
```

## Backend Setup (AKS)

### PostgreSQL StatefulSet

1. Create a dedicated storage class:
```yaml
# storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: postgres-sc
provisioner: kubernetes.io/azure-disk
parameters:
  storageaccounttype: Premium_LRS
```

2. Deploy PostgreSQL StatefulSet:
```yaml
# postgres-statefulset.yaml
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
        env:
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: database-name
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secrets
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: postgres-sc
      resources:
        requests:
          storage: 10Gi
```

### Django Application

1. Containerize Django application:
```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["gunicorn", "project.wsgi:application", "--bind", "0.0.0.0:8000"]
```

2. Build and push Docker image:
```bash
docker build -t your-acr.azurecr.io/django-app:latest .
docker push your-acr.azurecr.io/django-app:latest
```

3. Deploy Django application:
```yaml
# django-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: django-app
  namespace: userportal
spec:
  replicas: 3
  selector:
    matchLabels:
      app: django-app
  template:
    metadata:
      labels:
        app: django-app
    spec:
      containers:
      - name: django-app
        image: your-acr.azurecr.io/django-app:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: django-secrets
              key: database-url
        - name: DJANGO_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: django-secrets
              key: secret-key
```

## Kubernetes Configuration

1. Create namespace:
```bash
kubectl create namespace userportal
```

2. Create secrets:
```bash
kubectl create secret generic postgres-secrets \
  --from-literal=database-name=yourdb \
  --from-literal=username=youruser \
  --from-literal=password=yourpassword \
  -n userportal

kubectl create secret generic django-secrets \
  --from-literal=database-url=postgresql://youruser:yourpassword@postgres:5432/yourdb \
  --from-literal=secret-key=your-django-secret-key \
  -n userportal
```

3. Deploy services:
```yaml
# services.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: userportal
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432

---
apiVersion: v1
kind: Service
metadata:
  name: django-app
  namespace: userportal
spec:
  type: LoadBalancer
  selector:
    app: django-app
  ports:
  - port: 80
    targetPort: 8000
```

## Monitoring and Maintenance

1. Check pod status:
```bash
kubectl get pods -n userportal
```

2. View logs:
```bash
kubectl logs -f deployment/django-app -n userportal
```

3. Scale application:
```bash
kubectl scale deployment django-app --replicas=5 -n userportal
```

## Backup and Recovery

1. PostgreSQL backup:
```bash
kubectl exec -n userportal postgres-0 -- pg_dump -U youruser yourdb > backup.sql
```

2. Restore from backup:
```bash
kubectl exec -i -n userportal postgres-0 -- psql -U youruser yourdb < backup.sql
```

## Security Considerations

1. Network Policies:
```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-network-policy
  namespace: userportal
spec:
  podSelector:
    matchLabels:
      app: postgres
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: django-app
    ports:
    - protocol: TCP
      port: 5432
```

2. Enable Azure Disk Encryption
3. Configure CloudFront security headers
4. Implement WAF rules on CloudFront
5. Regular security updates for all components

## Troubleshooting

1. Database connectivity issues:
```bash
kubectl exec -it postgres-0 -n userportal -- psql -U youruser -d yourdb
```

2. Check Django application logs:
```bash
kubectl logs -f deployment/django-app -n userportal
```

3. Verify CloudFront distribution:
```bash
aws cloudfront get-distribution --id your-distribution-id
```

## Contributing

Please follow the standard Git workflow:
1. Create a feature branch
2. Make changes
3. Submit PR for review
4. Merge after approval

## License

[Your License]
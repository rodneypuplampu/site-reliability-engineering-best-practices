# Azure SRE Example Userportal App

This repository contains the infrastructure and application code for a cloud-native user portal application deployed on AWS EKS with Azure CDN for frontend content delivery and PostgreSQL StatefulSet for persistent storage.

## Architecture Overview

- Frontend: React application served through Azure CDN
- Backend: Django REST API containerized and deployed on EKS
- Database: PostgreSQL running as a StatefulSet in Kubernetes
- Infrastructure: AWS EKS cluster with dedicated userportal namespace

## Prerequisites

- AWS CLI configured with appropriate permissions
- kubectl installed and configured
- Azure CLI configured with CDN access
- Docker installed for container builds
- Helm v3.x installed

## Repository Structure

```
├── frontend/                 # React application code
├── backend/                  # Django application code
├── k8s/                     # Kubernetes manifests
│   ├── userportal/         # Namespace-specific resources
│   ├── postgres/           # PostgreSQL StatefulSet configs
│   └── ingress/           # Ingress configurations
├── terraform/               # Infrastructure as Code
│   ├── eks/               # EKS cluster configuration
│   └── azure-cdn/         # Azure CDN configuration
└── scripts/                # Deployment and utility scripts
```

## Quick Start

1. **Deploy EKS Cluster**
```bash
cd terraform/eks
terraform init
terraform apply
```

2. **Configure Azure CDN**
```bash
cd ../azure-cdn
terraform init
terraform apply
```

3. **Deploy PostgreSQL StatefulSet**
```bash
kubectl apply -f k8s/userportal/namespace.yaml
kubectl apply -f k8s/postgres/
```

4. **Build and Deploy Backend**
```bash
# Build Django container
docker build -t userportal-backend:latest backend/

# Push to container registry
docker tag userportal-backend:latest <your-registry>/userportal-backend:latest
docker push <your-registry>/userportal-backend:latest

# Deploy to EKS
kubectl apply -f k8s/userportal/
```

5. **Deploy Frontend to Azure CDN**
```bash
cd frontend
npm run build
az storage blob upload-batch -d '$web' -s ./build
```

## Configuration

### PostgreSQL StatefulSet

The PostgreSQL StatefulSet is configured with:
- Persistent volume claims for data persistence
- Automated backups
- High availability with primary/replica setup

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
```

### Django Backend

The Django application is containerized and configured to:
- Connect to PostgreSQL using environment variables
- Handle static files through Azure CDN
- Scale horizontally based on CPU/memory usage

### Azure CDN Configuration

Frontend assets are served through Azure CDN with:
- Custom domain setup
- HTTPS enforcement
- Caching rules for optimal performance
- Geographic distribution

## Monitoring and Logging

- EKS cluster metrics available through CloudWatch
- Application logs collected via Fluentd
- PostgreSQL metrics tracked through Prometheus
- Azure CDN metrics accessible through Azure Monitor

## Scaling

### Horizontal Pod Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: userportal-backend
  namespace: userportal
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: userportal-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Backup and Disaster Recovery

- PostgreSQL: Daily automated backups using pg_dump
- Application state: Stored in PostgreSQL
- Infrastructure: Defined as code in Terraform
- CDN: Content backed up in Azure Storage

## Security

- Network policies enforced at namespace level
- Secrets managed through AWS Secrets Manager
- TLS encryption for all external communication
- RBAC configured for Kubernetes resources

## Development

### Local Setup
1. Install dependencies:
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

2. Run locally:
```bash
# Backend
python manage.py runserver

# Frontend
npm start
```

### Testing
```bash
# Backend tests
python manage.py test

# Frontend tests
npm test
```

## Deployment

### Production Deployment
1. Update version tags in deployment manifests
2. Deploy database changes:
```bash
kubectl apply -f k8s/postgres/migrations/
```
3. Deploy application updates:
```bash
kubectl apply -f k8s/userportal/
```
4. Update frontend in Azure CDN:
```bash
npm run build
az storage blob upload-batch -d '$web' -s ./build
az cdn endpoint purge -g myResourceGroup -n myEndpoint --content-paths "/*"
```

## Troubleshooting

Common issues and solutions:
1. Database connection issues:
   - Check PostgreSQL StatefulSet status
   - Verify secrets are properly mounted
   - Check network policies

2. CDN caching issues:
   - Purge CDN cache
   - Verify cache rules
   - Check origin health

3. EKS scaling issues:
   - Check HPA metrics
   - Verify resource requests/limits
   - Check cluster autoscaler logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

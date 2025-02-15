# Django User Portal - GKE Deployment Guide

## Architecture Overview

This project implements a Django-based user authentication portal deployed on Google Kubernetes Engine (GKE) with the following components:
- Frontend served through Google Cloud CDN
- AlloyDB backend with StatefulSet
- Containerized Django application
- Kubernetes configurations for the userportal namespace

### Infrastructure Components
```
├── Frontend (Cloud CDN)
│   ├── Static assets
│   └── Cache configurations
├── Backend (GKE)
│   ├── Django application
│   ├── userportal namespace
│   └── Service configurations
└── Database (AlloyDB)
    ├── StatefulSet
    └── Persistent storage
```

## Prerequisites

- Google Cloud SDK installed and configured
- Docker installed locally
- kubectl configured with GKE cluster
- Access to GCP project with required permissions
- Python 3.8+ and Django 4.2+

## Project Structure

```
project/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── kubernetes/
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   └── statefulset.yaml
├── django_app/
│   ├── manage.py
│   ├── requirements.txt
│   └── userportal/
│       ├── settings.py
│       ├── urls.py
│       └── views.py
└── cdn/
    └── cdn-config.yaml
```

## Django Application Setup

1. Create Django project and app:
```bash
django-admin startproject userportal
cd userportal
python manage.py startapp authentication
```

2. Configure Django settings (`settings.py`):
```python
INSTALLED_APPS = [
    # ...
    'authentication',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Static file configuration for CDN
STATIC_URL = 'https://storage.googleapis.com/your-bucket/'
STATIC_ROOT = 'static'
```

## Docker Configuration

Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "userportal.wsgi:application", "--bind", "0.0.0.0:8000"]
```

## Kubernetes Configuration

1. Create namespace:
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: userportal
```

2. Configure StatefulSet for AlloyDB:
```yaml
# statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: alloydb
  namespace: userportal
spec:
  serviceName: alloydb
  replicas: 3
  selector:
    matchLabels:
      app: alloydb
  template:
    metadata:
      labels:
        app: alloydb
    spec:
      containers:
      - name: alloydb
        image: gcr.io/your-project/alloydb:latest
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

3. Deploy Django application:
```yaml
# deployment.yaml
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
        image: gcr.io/your-project/django-app:latest
        ports:
        - containerPort: 8000
        env:
        - name: DB_HOST
          value: alloydb
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: db-name
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
```

## Cloud CDN Setup

1. Create backend service configuration:
```yaml
# cdn-config.yaml
apiVersion: compute.cnrm.cloud.google.com/v1beta1
kind: ComputeBackendService
metadata:
  name: django-backend
  namespace: userportal
spec:
  cdnPolicy:
    cacheMode: USE_ORIGIN_HEADERS
    defaultTtl: 3600s
  protocol: HTTPS
  timeoutSec: 30
```

## Deployment Steps

1. Build and push Docker image:
```bash
docker build -t gcr.io/your-project/django-app:latest .
docker push gcr.io/your-project/django-app:latest
```

2. Create namespace and apply configurations:
```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/statefulset.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
```

3. Configure Cloud CDN:
```bash
gcloud compute backend-services create django-backend \
    --global \
    --enable-cdn \
    --protocol=HTTPS
```

## Security Considerations

1. Use secrets for sensitive data:
```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: userportal
type: Opaque
data:
  username: <base64-encoded-username>
  password: <base64-encoded-password>
  db-name: <base64-encoded-dbname>
```

2. Network policies:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-access
  namespace: userportal
spec:
  podSelector:
    matchLabels:
      app: alloydb
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: django
```

## Monitoring and Maintenance

1. Configure liveness and readiness probes:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

2. Set up Cloud Monitoring:
```bash
gcloud monitoring dashboards create \
    --dashboard-json-file=monitoring-dashboard.json
```

## Backup and Recovery

1. Configure automatic backups for AlloyDB:
```yaml
apiVersion: backup.gcp.io/v1
kind: BackupSchedule
metadata:
  name: db-backup
  namespace: userportal
spec:
  schedule: "0 2 * * *"
  retention: 7d
```

## Scaling

1. Configure Horizontal Pod Autoscaling:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: django-hpa
  namespace: userportal
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: django-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

Common issues and solutions:
1. Database connection issues:
   - Check network policies
   - Verify credentials in secrets
   - Confirm AlloyDB StatefulSet is running

2. CDN cache issues:
   - Verify cache headers
   - Check backend service configuration
   - Monitor cache hit rates

3. Pod scheduling issues:
   - Check resource quotas
   - Verify node pool capacity
   - Review pod anti-affinity rules

## Testing

1. Load testing command:
```bash
hey -n 1000 -c 100 https://your-domain.com/login
```

2. Database connection test:
```bash
kubectl exec -it alloydb-0 -n userportal -- psql -U postgres -c "\l"
```

For additional support or questions, please refer to the project documentation or open an issue in the repository.
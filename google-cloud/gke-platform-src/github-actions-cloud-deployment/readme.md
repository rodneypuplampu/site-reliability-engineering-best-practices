# Secure GitHub Actions Integration with Google Cloud Platform

This project implements a secure CI/CD pipeline using GitHub Actions and Google Cloud Platform (GCP) following the Workload Identity Federation approach, which is the recommended security practice for cloud authentication.

## Project Overview

This implementation:
1. Configures Workload Identity Federation in GCP for secure authentication
2. Sets up GitHub Actions to build and push Docker images to Artifact Registry
3. Configures Cloud Build triggers to handle infrastructure deployment
4. Maintains separation of concerns for enhanced security

## Prerequisites

- GitHub repository with your application code
- Google Cloud Platform account with billing enabled
- Required GCP services: IAM, Artifact Registry, Cloud Build, Cloud Source Repositories
- `gcloud` CLI installed locally for initial setup

## Implementation Guide

### 1. Set Up GCP Environment

First, let's set up the necessary resources in GCP:

```bash
# Set your project variables
PROJECT_ID="your-project-id"
REGION="us-central1"
REPOSITORY="my-app"
SERVICE_ACCOUNT_NAME="github-actions-sa"
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"

# Set default project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable iamcredentials.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    sourcerepo.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create $REPOSITORY \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for GitHub Actions workflow"

# Create a Cloud Source Repository (optional)
gcloud source repos create $REPOSITORY

# Create service account for GitHub Actions
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="GitHub Actions Service Account"

# Grant necessary permissions to the service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/source.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.editor"
```

### 2. Configure Workload Identity Federation

```bash
# Create a Workload Identity Pool
gcloud iam workload-identity-pools create $POOL_NAME \
    --location="global" \
    --display-name="GitHub Actions Pool"

# Get the Workload Identity Pool ID
POOL_ID=$(gcloud iam workload-identity-pools describe $POOL_NAME \
    --location="global" \
    --format="value(name)")

# Create a Workload Identity Provider in the pool
gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
    --location="global" \
    --workload-identity-pool=$POOL_NAME \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# Get the Workload Identity Provider resource name
PROVIDER_ID=$(gcloud iam workload-identity-pools providers describe $PROVIDER_NAME \
    --location="global" \
    --workload-identity-pool=$POOL_NAME \
    --format="value(name)")

# Allow GitHub Actions to impersonate the service account
# Replace GITHUB_USERNAME and GITHUB_REPO with your actual values
gcloud iam service-accounts add-iam-policy-binding \
    $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/GITHUB_USERNAME/GITHUB_REPO"
```

### 3. GitHub Actions Workflow Configuration

Create a `.github/workflows/build-and-push.yml` file in your repository:

```yaml
name: Build and Push to GCP

on:
  push:
    branches:
      - main

jobs:
  build_and_push:
    name: Build and Push
    runs-on: ubuntu-latest
    permissions:
      contents: 'read'
      id-token: 'write'
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Authenticate to Google Cloud
        uses: 'google-github-actions/auth@v1'
        with:
          workload_identity_provider: 'projects/${{ env.PROJECT_ID }}/locations/global/workloadIdentityPools/${{ env.POOL_NAME }}/providers/${{ env.PROVIDER_NAME }}'
          service_account: '${{ env.SERVICE_ACCOUNT_NAME }}@${{ env.PROJECT_ID }}.iam.gserviceaccount.com'
      
      - name: Set up Cloud SDK
        uses: 'google-github-actions/setup-gcloud@v1'
      
      - name: Configure Docker for Artifact Registry
        run: |
          gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev
      
      - name: Build and push Docker image
        run: |
          docker build -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/app:${{ github.sha }} .
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/app:${{ github.sha }}
      
      - name: Clone Cloud Source Repository
        run: |
          gcloud source repos clone ${{ env.REPOSITORY }} --project=${{ env.PROJECT_ID }}
      
      - name: Update deployment configurations
        run: |
          cd ${{ env.REPOSITORY }}
          # Update your deployment configurations with the new image tag
          sed -i "s|image:.*|image: ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/app:${{ github.sha }}|g" deployment.yaml
          git config --global user.email "github-actions@github.com"
          git config --global user.name "GitHub Actions"
          git add deployment.yaml
          git commit -m "Update image to ${{ github.sha }}"
          git push
```

### 4. Configure Cloud Build for Infrastructure Deployment

Create a Cloud Build trigger that watches for changes in your Cloud Source Repository:

```bash
# Create a Cloud Build trigger
gcloud builds triggers create cloud-source-repositories \
    --name="deploy-from-source-repo" \
    --repo=$REPOSITORY \
    --branch-pattern="main" \
    --build-config="cloudbuild.yaml"
```

Create a `cloudbuild.yaml` file in your repository:

```yaml
steps:
  # Install/setup any necessary tools
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'Setup'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        apt-get update && apt-get install -y kubectl

  # Deploy to GKE (example)
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'Deploy'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        gcloud container clusters get-credentials my-cluster --zone us-central1-a --project ${PROJECT_ID}
        kubectl apply -f deployment.yaml
        kubectl apply -f service.yaml

# Optionally, configure timeout
timeout: '1200s'
```

### 5. Create the necessary Kubernetes YAML files

#### deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: us-central1-docker.pkg.dev/your-project-id/my-app/app:latest
        ports:
        - containerPort: 8080
```

#### service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

## Security Considerations

1. **Minimal Permissions**: The GitHub Actions service account has only the minimum permissions required (Artifact Registry write, Source Repository write, Cloud Build invocation).

2. **No Long-lived Credentials**: Using Workload Identity Federation eliminates the need for storing long-lived service account keys.

3. **Separation of Concerns**: GitHub Actions handles only artifact building and pushing, while Cloud Build (with its own service account) handles infrastructure deployment.

4. **Audit Trail**: All actions in both GitHub and GCP are logged, providing a complete audit trail.

## Maintenance and Operations

- Regularly audit IAM permissions to ensure they remain at the minimum necessary level
- Monitor GitHub Actions workflows and Cloud Build jobs for any failures
- Consider implementing automated security scanning of Docker images
- Rotate any secrets regularly if they're used in the pipeline

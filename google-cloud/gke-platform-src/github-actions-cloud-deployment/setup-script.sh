#!/bin/bash
# Script to set up Workload Identity Federation for GitHub Actions with GCP

# Exit on any error
set -e

# Set your project variables
PROJECT_ID="your-project-id"
REGION="us-central1"
REPOSITORY="my-app"
SERVICE_ACCOUNT_NAME="github-actions-sa"
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"
GITHUB_USERNAME="your-github-username"
GITHUB_REPO="your-repo-name"

# Set default project
echo "Setting default project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable iamcredentials.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    sourcerepo.googleapis.com \
    container.googleapis.com

# Create Artifact Registry repository
echo "Creating Artifact Registry repository..."
gcloud artifacts repositories create $REPOSITORY \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for GitHub Actions workflow"

# Create a Cloud Source Repository (optional)
echo "Creating Cloud Source Repository..."
gcloud source repos create $REPOSITORY

# Create service account for GitHub Actions
echo "Creating service account for GitHub Actions..."
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="GitHub Actions Service Account"

# Grant necessary permissions to the GitHub Actions service account
echo "Granting permissions to the GitHub Actions service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/source.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.editor"

# Create a service account for Cloud Build (if not using default)
echo "Creating service account for Cloud Build..."
gcloud iam service-accounts create cloudbuild \
    --display-name="Cloud Build Service Account"

# Grant necessary permissions to the Cloud Build service account
echo "Granting permissions to the Cloud Build service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:cloudbuild@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer"

# Create a Workload Identity Pool
echo "Creating Workload Identity Pool..."
gcloud iam workload-identity-pools create $POOL_NAME \
    --location="global" \
    --display-name="GitHub Actions Pool"

# Get the Workload Identity Pool ID
POOL_ID=$(gcloud iam workload-identity-pools describe $POOL_NAME \
    --location="global" \
    --format="value(name)")

# Create a Workload Identity Provider in the pool
echo "Creating Workload Identity Provider..."
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
echo "Allowing GitHub Actions to impersonate the service account..."
gcloud iam service-accounts add-iam-policy-binding \
    $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_USERNAME}/${GITHUB_REPO}"

# Create a Cloud Build trigger
echo "Creating Cloud Build trigger..."
gcloud builds triggers create cloud-source-repositories \
    --name="deploy-from-source-repo" \
    --repo=$REPOSITORY \
    --branch-pattern="main" \
    --build-config="cloudbuild.yaml"

echo "Setup complete! Please ensure you have:"
echo "1. A GitHub repository at ${GITHUB_USERNAME}/${GITHUB_REPO}"
echo "2. Added the workflow file to .github/workflows/"
echo "3. Created a cloudbuild.yaml file in your repository"
echo "4. Created your Kubernetes deployment files in the k8s/ directory"

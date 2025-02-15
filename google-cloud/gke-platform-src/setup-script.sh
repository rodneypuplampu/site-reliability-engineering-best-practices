#!/bin/bash

# Environment variables
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
BUCKET_NAME="${PROJECT_ID}-terraform-state"
SERVICE_ACCOUNT_NAME="terraform"
SERVICE_ACCOUNT_EMAIL="terraform@${PROJECT_ID}.iam.gserviceaccount.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Starting GCP project setup for GKE deployment..."

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 successful${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Enable required APIs
apis=(
    "storage-api.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "compute.googleapis.com"
    "container.googleapis.com"
    "iam.googleapis.com"
    "alloydb.googleapis.com"
    "servicenetworking.googleapis.com"
    "cloudbuild.googleapis.com"
)

for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api
    check_status "Enabling $api"
done

# Create service account
echo "Creating Terraform service account..."
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="Terraform Service Account"
check_status "Service account creation"

# Assign roles
roles=(
    "roles/storage.admin"
    "roles/container.admin"
    "roles/compute.admin"
    "roles/iam.serviceAccountUser"
    "roles/alloydb.admin"
)

for role in "${roles[@]}"; do
    echo "Assigning $role to service account..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role"
    check_status "Role assignment: $role"
done

# Create and configure GCS bucket for Terraform state
echo "Creating GCS bucket for Terraform state..."
gsutil mb -l $REGION gs://$BUCKET_NAME
check_status "Bucket creation"

echo "Setting bucket versioning..."
gsutil versioning set on gs://$BUCKET_NAME
check_status "Bucket versioning"

echo "Setting bucket permissions..."
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT_EMAIL:objectAdmin gs://$BUCKET_NAME
check_status "Bucket permissions"

# Create service account key
echo "Creating service account key..."
gcloud iam service-accounts keys create terraform-key.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL
check_status "Service account key creation"

echo "Setup complete! Your Terraform service account and state bucket are ready."
echo "Terraform state bucket: gs://$BUCKET_NAME"
echo "Service account key saved as: terraform-key.json"

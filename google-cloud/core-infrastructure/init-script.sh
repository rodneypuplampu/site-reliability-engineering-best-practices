#!/bin/bash

# Environment variables
ORGANIZATION_ID="YOUR_ORG_ID"
BILLING_ACCOUNT="YOUR_BILLING_ACCOUNT"
HUB_PROJECT_ID="network-hub-prod"
HUB_PROJECT_NAME="Network Hub Production"
TERRAFORM_STATE_BUCKET="${HUB_PROJECT_ID}-tfstate"
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 successful${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

echo "Creating Network Hub Project..."

# Create network hub project
gcloud projects create ${HUB_PROJECT_ID} \
    --organization ${ORGANIZATION_ID} \
    --name "${HUB_PROJECT_NAME}" \
    --set-as-default
check_status "Project creation"

# Link billing account
gcloud beta billing projects link ${HUB_PROJECT_ID} \
    --billing-account ${BILLING_ACCOUNT}
check_status "Billing account linking"

# Enable required APIs
apis=(
    "compute.googleapis.com"
    "servicenetworking.googleapis.com"
    "dns.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "container.googleapis.com"
    "networkmanagement.googleapis.com"
    "networksecurity.googleapis.com"
    "networkconnectivity.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
    "cloudkms.googleapis.com"
    "cloudbilling.googleapis.com"
    "cloudidentity.googleapis.com"
)

for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api --project ${HUB_PROJECT_ID}
    check_status "Enabling $api"
done

# Create service account for Terraform
echo "Creating Terraform service account..."
gcloud iam service-accounts create terraform \
    --display-name "Terraform Network Hub Admin" \
    --project ${HUB_PROJECT_ID}
check_status "Service account creation"

# Grant necessary roles
roles=(
    "roles/compute.networkAdmin"
    "roles/compute.securityAdmin"
    "roles/compute.instanceAdmin"
    "roles/dns.admin"
    "roles/iam.serviceAccountUser"
    "roles/resourcemanager.projectIamAdmin"
    "roles/storage.admin"
    "roles/monitoring.admin"
    "roles/logging.admin"
)

for role in "${roles[@]}"; do
    echo "Assigning $role..."
    gcloud projects add-iam-policy-binding ${HUB_PROJECT_ID} \
        --member="serviceAccount:terraform@${HUB_PROJECT_ID}.iam.gserviceaccount.com" \
        --role="$role"
    check_status "Role assignment: $role"
done

# Create GCS bucket for Terraform state
echo "Creating Terraform state bucket..."
gsutil mb -p ${HUB_PROJECT_ID} -l ${REGION} gs://${TERRAFORM_STATE_BUCKET}
check_status "State bucket creation"

# Enable versioning for state bucket
gsutil versioning set on gs://${TERRAFORM_STATE_BUCKET}
check_status "Bucket versioning"

# Set bucket permissions
gsutil iam ch serviceAccount:terraform@${HUB_PROJECT_ID}.iam.gserviceaccount.com:objectAdmin \
    gs://${TERRAFORM_STATE_BUCKET}
check_status "Bucket permissions"

# Create service account key
echo "Creating service account key..."
gcloud iam service-accounts keys create terraform-key.json \
    --iam-account=terraform@${HUB_PROJECT_ID}.iam.gserviceaccount.com \
    --project ${HUB_PROJECT_ID}
check_status "Service account key creation"

echo "Network Hub Project setup complete!"
echo "Project ID: ${HUB_PROJECT_ID}"
echo "Terraform state bucket: gs://${TERRAFORM_STATE_BUCKET}"
echo "Service account key saved as: terraform-key.json"
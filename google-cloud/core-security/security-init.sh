#!/bin/bash

# Environment variables
ORGANIZATION_ID="YOUR_ORG_ID"
BILLING_ACCOUNT="YOUR_BILLING_ACCOUNT"
SECURITY_PROJECT_ID="security-hub-prod"
NETWORK_HUB_PROJECT_ID="network-hub-prod"
TERRAFORM_STATE_BUCKET="${SECURITY_PROJECT_ID}-tfstate"
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

echo "Creating Security Hub Project..."

# Create security project
gcloud projects create ${SECURITY_PROJECT_ID} \
    --organization ${ORGANIZATION_ID} \
    --name "Security Hub Production" \
    --set-as-default
check_status "Project creation"

# Link billing account
gcloud beta billing projects link ${SECURITY_PROJECT_ID} \
    --billing-account ${BILLING_ACCOUNT}
check_status "Billing account linking"

# Enable required APIs
apis=(
    "securitycenter.googleapis.com"
    "cloudkms.googleapis.com"
    "cloudasset.googleapis.com"
    "websecurityscanner.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
    "cloudidentity.googleapis.com"
    "secretmanager.googleapis.com"
    "dns.googleapis.com"
    "compute.googleapis.com"
    "container.googleapis.com"
    "binaryauthorization.googleapis.com"
    "vpcaccess.googleapis.com"
    "servicenetworking.googleapis.com"
    "cloudfunctions.googleapis.com"
)

for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api --project ${SECURITY_PROJECT_ID}
    check_status "Enabling $api"
done

# Create service account for Terraform
echo "Creating Terraform service account..."
gcloud iam service-accounts create terraform \
    --display-name "Terraform Security Admin" \
    --project ${SECURITY_PROJECT_ID}
check_status "Service account creation"

# Grant necessary roles
roles=(
    "roles/securitycenter.admin"
    "roles/monitoring.admin"
    "roles/logging.admin"
    "roles/iam.securityAdmin"
    "roles/compute.securityAdmin"
    "roles/cloudasset.owner"
    "roles/websecurityscanner.editor"
    "roles/binaryauthorization.policyAdmin"
    "roles/secretmanager.admin"
)

for role in "${roles[@]}"; do
    echo "Assigning $role..."
    gcloud projects add-iam-policy-binding ${SECURITY_PROJECT_ID} \
        --member="serviceAccount:terraform@${SECURITY_PROJECT_ID}.iam.gserviceaccount.com" \
        --role="$role"
    check_status "Role assignment: $role"
done

# Create GCS bucket for Terraform state
echo "Creating Terraform state bucket..."
gsutil mb -p ${SECURITY_PROJECT_ID} -l ${REGION} gs://${TERRAFORM_STATE_BUCKET}
check_status "State bucket creation"

# Enable versioning for state bucket
gsutil versioning set on gs://${TERRAFORM_STATE_BUCKET}
check_status "Bucket versioning"

# Create service account key
echo "Creating service account key..."
gcloud iam service-accounts keys create terraform-key.json \
    --iam-account=terraform@${SECURITY_PROJECT_ID}.iam.gserviceaccount.com \
    --project ${SECURITY_PROJECT_ID}
check_status "Service account key creation"

# Setup Security Command Center
echo "Setting up Security Command Center..."
gcloud scc settings update \
    --organization=${ORGANIZATION_ID} \
    --enable-security-center-api
check_status "Security Command Center setup"

echo "Security Hub Project setup complete!"
echo "Project ID: ${SECURITY_PROJECT_ID}"
echo "Terraform state bucket: gs://${TERRAFORM_STATE_BUCKET}"
echo "Service account key saved as: terraform-key.json"
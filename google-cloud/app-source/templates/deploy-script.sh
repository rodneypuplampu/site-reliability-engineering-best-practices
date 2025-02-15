#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
CLUSTER_NAME="main-cluster"
NAMESPACE="usersignin"

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 successful${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Terraform is not installed${NC}"
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        echo -e "${RED}Helm is not installed${NC}"
        exit 1
    }
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}kubectl is not installed${NC}"
        exit 1
    }
    
    check_status "Prerequisites check"
}

# Build and push Docker image
build_and_push_image() {
    echo "Building and pushing Docker image..."
    
    # Build the image
    docker build -t gcr.io/${PROJECT_ID}/django-signin:latest ./django
    check_status "Docker build"
    
    # Push to GCR
    docker push gcr.io/${PROJECT_ID}/django-signin:latest
    check_status "Docker push"
}

# Initialize Terraform
init_terraform() {
    echo "Initializing Terraform..."
    
    cd terraform
    terraform init
    check_status "Terraform init"
}

# Apply Terraform configuration
apply_terraform() {
    echo "Applying Terraform configuration..."
    
    terraform apply -auto-approve \
        -var="project_id=${PROJECT_ID}" \
        -var="region=${REGION}" \
        -var="cluster_name=${CLUSTER_NAME}" \
        -var="django_secret_key=${DJANGO_SECRET_KEY}" \
        -var="db_password=${DB_PASSWORD}" \
        -var="alloydb_host=${ALLOYDB_HOST}"
    
    check_status "Terraform apply"
}

# Verify deployment
verify_deployment() {
    echo "Verifying deployment..."
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=django-signin -n ${NAMESPACE} --timeout=300s
    check_status "Pod readiness check"
    
    # Check service
    kubectl get svc -n ${NAMESPACE}
    check_status "Service check"
    
    # Check ingress
    kubectl get ingress -n ${NAMESPACE}
    check_status "Ingress check"
    
    # Get deployment status
    kubectl rollout status deployment/django-signin -n ${NAMESPACE}
    check_status "Deployment status check"
}

# Main deployment process
main() {
    echo -e "${YELLOW}Starting deployment process...${NC}"
    
    # Check prerequisites
    check_prerequisites
    
    # Build and push Docker image
    build_and_push_image
    
    # Initialize and apply Terraform
    init_terraform
    apply_terraform
    
    # Verify deployment
    verify_deployment
    
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    
    # Display access information
    echo -e "\nAccess Information:"
    echo -e "Namespace: ${NAMESPACE}"
    echo -e "Service: django-signin"
    kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}'
}

# Check if required environment variables are set
if [ -z "${DJANGO_SECRET_KEY}" ] || [ -z "${DB_PASSWORD}" ] || [ -z "${ALLOYDB_HOST}" ]; then
    echo -e "${RED}Error: Required environment variables not set${NC}"
    echo "Please set the following environment variables:"
    echo "- DJANGO_SECRET_KEY"
    echo "- DB_PASSWORD"
    echo "- ALLOYDB_HOST"
    exit 1
fi

# Run main function
main

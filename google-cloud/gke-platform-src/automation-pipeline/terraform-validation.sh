#!/bin/bash
# validate_terraform.sh
# Validates Terraform configurations

set -e

echo "Validating Terraform configurations..."

# Check for terraform binary
if ! command -v terraform &> /dev/null; then
    echo "Terraform is not installed or not in PATH"
    exit 1
fi

# Validate modules
echo "Validating Terraform modules..."
find ./terraform/modules -type d -mindepth 1 -maxdepth 1 | while read module_dir; do
    echo "Validating module: $module_dir"
    cd "$module_dir"
    terraform init -backend=false
    terraform validate
    cd - > /dev/null
done

# Validate environment configurations
echo "Validating environment configurations..."
for env in dev prod; do
    echo "Validating $env environment"
    cd "./terraform/environments/$env"
    
    # Init with backend config but don't actually use remote state
    terraform init -backend=false
    
    # Validate the configuration
    terraform validate
    
    # Use terraform plan with detailed exit codes to check for errors
    # Exit code 0 = success, 1 = error, 2 = changes needed (which is fine for validation)
    terraform plan -detailed-exitcode -out=tfplan 2>/dev/null || [ $? -eq 2 ]
    
    cd - > /dev/null
done

echo "All Terraform configurations validated successfully!"

# Exit with success
exit 0

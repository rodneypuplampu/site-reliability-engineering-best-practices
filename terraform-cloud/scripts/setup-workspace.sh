# scripts/setup-workspace.sh
#!/bin/bash
set -euo pipefail

echo "Setting up Terraform Cloud workspace..."

# Validate environment variables
if [ -z "${TF_API_TOKEN:-}" ]; then
  echo "TF_API_TOKEN environment variable is required"
  exit 1
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "GITHUB_TOKEN environment variable is required"
  exit 1
fi

# Configure Terraform CLI config
cat > ~/.terraformrc << EOF
credentials "app.terraform.io" {
  token = "${TF_API_TOKEN}"
}
EOF

# Initialize Terraform
cd terraform
terraform init

# Create workspace if it doesn't exist
terraform workspace select github-integration || terraform workspace new github-integration

echo "Workspace setup completed!"

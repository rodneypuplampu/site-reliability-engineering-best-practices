#!/bin/bash
# security_scan.sh
# Performs security scanning on infrastructure code

set -e

echo "Running security scans on infrastructure code..."

# Install security scanning tools if not already present
pip install checkov tfsec-python

# Scan Terraform code with checkov
echo "Scanning Terraform with checkov..."
checkov -d ./terraform --quiet

# Scan Helm charts for security issues
echo "Scanning Helm charts for security issues..."
helm plugin install https://github.com/bridgecrewio/checkov 2>/dev/null || true

# Scan each Helm chart
find ./helm/charts -name "Chart.yaml" -exec dirname {} \; | while read chart_dir; do
    echo "Scanning chart: $chart_dir"
    helm checkov $chart_dir --quiet
done

# Scan for secrets in the codebase
echo "Scanning for hardcoded secrets..."
pip install detect-secrets
detect-secrets scan --all-files --exclude-files ".*\.asc$" > /tmp/secrets.json
if [ "$(grep -c "some_type_of_secret" /tmp/secrets.json)" -gt 0 ]; then
    echo "WARNING: Potential secrets found in codebase"
    cat /tmp/secrets.json
    exit 1
fi

# Validate IAM policies
echo "Validating IAM policies..."
find . -name "*iam*.tf" -o -name "*iam*.yaml" | while read policy_file; do
    echo "Checking policy file: $policy_file"
    if grep -q "roles/owner" "$policy_file"; then
        echo "ERROR: Owner role detected in $policy_file"
        exit 1
    fi
    if grep -q "roles/admin" "$policy_file"; then
        echo "WARNING: Admin role detected in $policy_file"
    fi
done

# Check for network security issues
echo "Checking network configurations..."
if grep -r "0.0.0.0/0" --include="*.tf" --include="*.yaml" .; then
    echo "WARNING: Found overly permissive network configurations (0.0.0.0/0)"
fi

echo "Security scan completed successfully!"

# Exit with success
exit 0

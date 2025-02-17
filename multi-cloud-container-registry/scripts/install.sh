# scripts/install.sh
#!/bin/bash
set -euo pipefail

echo "Installing Harbor Multi-Cloud Registry..."

# Check prerequisites
command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed. Aborting." >&2; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "helm is required but not installed. Aborting." >&2; exit 1; }

# Add Harbor Helm repository
helm repo add harbor https://helm.goharbor.io
helm repo update

# Create namespace
kubectl create namespace harbor --dry-run=client -o yaml | kubectl apply -f -

# Install Harbor
helm upgrade --install harbor harbor/harbor \
  --namespace harbor \
  --create-namespace \
  -f kubernetes/harbor/values.yaml

echo "Harbor installation completed!"

# scripts/configure-auth.sh
#!/bin/bash
set -euo pipefail

echo "Configuring cloud provider authentication..."

# Configure GCP
gcloud auth activate-service-account --key-file="${GCP_KEY_FILE}"

# Configure Azure
az login --service-principal \
  --username "${AZURE_CLIENT_ID}" \
  --password "${AZURE_CLIENT_SECRET}" \
  --tenant "${AZURE_TENANT_ID}"

# Configure AWS
aws configure set aws_access_key_id "${AWS_ACCESS_KEY_ID}"
aws configure set aws_secret_access_key "${AWS_SECRET_ACCESS_KEY}"
aws configure set region "${AWS_REGION}"

echo "Cloud provider authentication configured!"

# scripts/setup-replication.sh
#!/bin/bash
set -euo pipefail

echo "Setting up Harbor replication rules..."

# Get Harbor API token
TOKEN=$(curl -X POST "${HARBOR_URL}/api/v2.0/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${HARBOR_USERNAME}\",\"password\":\"${HARBOR_PASSWORD}\"}" \
  | jq -r .token)

# Create GCP replication
curl -X POST "${HARBOR_URL}/api/v2.0/replication/policies" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "name": "gcp-replication",
  "src_registry": {"id": 0},
  "dest_registry": {"id": 1},
  "dest_namespace": "gcp-registry",
  "trigger": {"type": "manual"},
  "deletion": false,
  "override": true,
  "enabled": true
}
EOF

# Similar configurations for Azure and AWS...

echo "Replication rules configured!"

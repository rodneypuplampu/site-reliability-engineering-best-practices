# scripts/configure-vcs.sh
#!/bin/bash
set -euo pipefail

echo "Configuring VCS integration..."

# Validate environment
if [ -z "${TF_ORGANIZATION:-}" ]; then
  echo "TF_ORGANIZATION environment variable is required"
  exit 1
fi

if [ -z "${GITHUB_REPOSITORY:-}" ]; then
  echo "GITHUB_REPOSITORY environment variable is required"
  exit 1
fi

# Create VCS connection
curl \
  --header "Authorization: Bearer ${TF_API_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data @- \
  https://app.terraform.io/api/v2/organizations/${TF_ORGANIZATION}/oauth-clients \
  << EOF
{
  "data": {
    "type": "oauth-clients",
    "attributes": {
      "service-provider": "github",
      "http-url": "https://github.com",
      "api-url": "https://api.github.com",
      "oauth-token-string": "${GITHUB_TOKEN}"
    }
  }
}
EOF

echo "VCS integration configured successfully!"

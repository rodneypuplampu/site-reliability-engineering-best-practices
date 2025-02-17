# README.md
# Terraform Cloud GitHub Integration

This repository contains configuration and setup for integrating a GitHub repository with Terraform Cloud for infrastructure management.

## Features

- Automated Terraform runs on pull requests
- Secure variable and state management
- VCS-driven workflow
- Policy as Code integration
- Automated plan and apply processes

## Prerequisites

- GitHub account with repository admin access
- Terraform Cloud account
- Terraform CLI installed locally
- GitHub Personal Access Token
- Terraform Cloud API token

## Quick Start

1. Fork/clone this repository
2. Set up Terraform Cloud workspace
3. Configure GitHub secrets
4. Update Terraform configuration

```bash
# Clone the repository
git clone https://github.com/your-org/terraform-cloud-github
cd terraform-cloud-github

# Run setup script
./scripts/setup-workspace.sh

# Configure VCS integration
./scripts/configure-vcs.sh
```

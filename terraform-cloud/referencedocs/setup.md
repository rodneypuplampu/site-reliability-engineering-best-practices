# docs/setup.md
# Setup Guide

## Initial Configuration

1. Create a Terraform Cloud account
2. Create a GitHub repository
3. Generate required tokens:
   - GitHub Personal Access Token
   - Terraform Cloud API Token

## Workspace Setup

1. Create a new workspace in Terraform Cloud
2. Configure VCS integration
3. Set up variables and environment
4. Configure run triggers

## GitHub Configuration

1. Add repository secrets:
   - TF_API_TOKEN
   - GITHUB_TOKEN
2. Enable GitHub Actions
3. Configure branch protection rules

## Operations

1. Create a new branch
2. Make infrastructure changes
3. Create pull request
4. Review Terraform plan
5. Merge and apply

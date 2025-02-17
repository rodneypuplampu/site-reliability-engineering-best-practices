# terraform/backend.tf
terraform {
  cloud {
    organization = "your-org-name"

    workspaces {
      name = "github-integration"
    }
  }
}

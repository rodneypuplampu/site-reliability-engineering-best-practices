# terraform/main.tf
terraform {
  required_providers {
    tfe = {
      source  = "hashicorp/tfe"
      version = "~> 0.42.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
}

provider "tfe" {
  # Token set via environment variable TFE_TOKEN
}

provider "github" {
  # Token set via environment variable GITHUB_TOKEN
}

resource "tfe_workspace" "main" {
  name         = "github-integration"
  organization = var.tfc_org_name
  
  vcs_repo {
    identifier     = "${var.github_org}/${var.github_repo}"
    oauth_token_id = var.oauth_token_id
  }

  working_directory = "terraform"
  
  trigger_prefixes = ["terraform/**"]
  
  queue_all_runs = false
}

resource "tfe_variable" "environment" {
  key          = "environment"
  value        = var.environment
  category     = "terraform"
  workspace_id = tfe_workspace.main.id
  description  = "Environment name"
}

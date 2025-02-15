# main.tf
terraform {
  required_version = ">= 1.0"
  
  backend "gcs" {
    bucket = "iam-portal-prod-tfstate"
    prefix = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
  }
}

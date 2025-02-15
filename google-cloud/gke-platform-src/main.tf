# main.tf
terraform {
  required_version = ">= 1.0"
  
  backend "gcs" {
    bucket = "PROJECT_ID-terraform-state"
    prefix = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

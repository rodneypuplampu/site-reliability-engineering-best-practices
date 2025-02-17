# terraform/main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Cloud Provider Configurations
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "azurerm" {
  features {}
}

provider "aws" {
  region = var.aws_region
}

# Harbor Infrastructure
resource "kubernetes_namespace" "harbor" {
  metadata {
    name = "harbor"
  }
}

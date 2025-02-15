# main.tf
terraform {
  required_version = ">= 1.0"
  
  backend "gcs" {
    bucket = "cidr-management-tfstate"
    prefix = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Core Infrastructure Network
resource "google_compute_network" "core_network" {
  name                    = "core-infrastructure"
  auto_create_subnetworks = false
  project                 = var.project_id
}

# Production Environment
resource "google_compute_subnetwork" "prod_subnets" {
  for_each = var.prod_subnets

  name          = "prod-${each.key}"
  ip_cidr_range = each.value.cidr_range
  region        = each.value.region
  network       = google_compute_network.core_network.id
  project       = var.project_id

  secondary_ip_ranges = each.value.secondary_ranges

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata            = "INCLUDE_ALL_METADATA"
  }
}

# Development Environment
resource "google_compute_subnetwork" "dev_subnets" {
  for_each = var.dev_subnets

  name          = "dev-${each.key}"
  ip_cidr_range = each.value.cidr_range
  region        = each.value.region
  network       = google_compute_network.core_network.id
  project       = var.project_id

  secondary_ip_ranges = each.value.secondary_ranges
}

# Staging Environment
resource "google_compute_subnetwork" "staging_subnets" {
  for_each = var.staging_subnets

  name          = "staging-${each.key}"
  ip_cidr_range = each.value.cidr_range
  region        = each.value.region
  network       = google_compute_network.core_network.id
  project       = var.project_id

  secondary_ip_ranges = each.value.secondary_ranges
}

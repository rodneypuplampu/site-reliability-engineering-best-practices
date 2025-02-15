# main.tf
terraform {
  required_version = ">= 1.0"
  
  backend "gcs" {
    bucket = "network-hub-prod-tfstate"
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

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Shared VPC Hub Network
resource "google_compute_network" "hub_vpc" {
  name                    = "hub-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
  routing_mode           = "GLOBAL"

  depends_on = [
    google_project_service.compute_api
  ]
}

# Subnets for different regions
resource "google_compute_subnetwork" "regional_subnets" {
  for_each      = var.regional_subnets
  name          = each.key
  project       = var.project_id
  region        = each.value.region
  network       = google_compute_network.hub_vpc.self_link
  ip_cidr_range = each.value.cidr
  
  secondary_ip_ranges = each.value.secondary_ranges

  private_ip_google_access = true
  
  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata            = "INCLUDE_ALL_METADATA"
  }
}

# Cloud Router for Cloud NAT
resource "google_compute_router" "router" {
  name    = "hub-cloud-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.hub_vpc.self_link

  bgp {
    asn = 64514
  }
}

# Cloud NAT
resource "google_compute_router_nat" "nat" {
  name                               = "hub-cloud-nat"
  project                           = var.project_id
  router                            = google_compute_router.router.name
  region                            = var.region
  nat_ip_allocate_option           = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# VPC Peering
resource "google_compute_network_peering" "peering" {
  for_each     = var.peered_vpcs
  name         = "peer-${each.key}"
  network      = google_compute_network.hub_vpc.self_link
  peer_network = "projects/${each.value.project}/global/networks/${each.value.vpc_name}"
}

# Cloud Interconnect
resource "google_compute_interconnect_attachment" "interconnect" {
  name                     = "hub-interconnect"
  project                 = var.project_id
  region                  = var.region
  type                    = "PARTNER"
  router                  = google_compute_router.router.id
  mtu                     = 1500
  encryption              = "IPSEC"
  admin_enabled           = true
}

# Cloud CDN
resource "google_compute_backend_bucket" "cdn_backend" {
  name                = "hub-cdn-backend"
  project            = var.project_id
  bucket_name        = google_storage_bucket.cdn_bucket.name
  enable_cdn         = true
}

resource "google_storage_bucket" "cdn_bucket" {
  name          = "${var.project_id}-cdn-assets"
  project       = var.project_id
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}

# Firewall Rules
resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  project = var.project_id
  network = google_compute_network.hub_vpc.name

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = [for subnet in google_compute_subnetwork.regional_subnets : subnet.ip_cidr_range]
}

# Security Command Center
resource "google_scc_source" "custom_source" {
  provider = google-beta
  display_name = "Network Hub Security Source"
  organization = var.organization_id
  description  = "Security command center for network hub"
}

# Log Sinks
resource "google_logging_project_sink" "vpc_flows" {
  name        = "vpc-flows-sink"
  project     = var.project_id
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.vpc_flows.dataset_id}"
  filter      = "resource.type=\"gce_subnetwork\" AND jsonPayload.vpc_flow_log"

  bigquery_options {
    use_partitioned_tables = true
  }
}

resource "google_bigquery_dataset" "vpc_flows" {
  dataset_id  = "vpc_flows"
  project     = var.project_id
  location    = var.region
  description = "VPC Flow Logs Dataset"
}

# Monitoring
resource "google_monitoring_dashboard" "network_dashboard" {
  project        = var.project_id
  dashboard_json = file("${path.module}/dashboards/network.json")
}

# DNS
resource "google_dns_managed_zone" "private_zone" {
  name        = "private-zone"
  project     = var.project_id
  dns_name    = "internal.example.com."
  visibility  = "private"
  
  private_visibility_config {
    networks {
      network_url = google_compute_network.hub_vpc.id
    }
  }
}

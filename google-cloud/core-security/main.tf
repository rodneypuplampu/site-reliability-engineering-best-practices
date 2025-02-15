# main.tf
terraform {
  required_version = ">= 1.0"
  
  backend "gcs" {
    bucket = "security-hub-prod-tfstate"
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

# Security Command Center Configuration
resource "google_scc_source" "security_source" {
  provider     = google-beta
  organization = var.organization_id
  display_name = "Enterprise Security Monitoring"
  description  = "Security monitoring for network and infrastructure"
}

# Create custom finding
resource "google_scc_source_iam_binding" "finding" {
  provider = google-beta
  source   = google_scc_source.security_source.name
  role     = "roles/securitycenter.findingSecurityMarksWriter"
  members  = ["serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"]
}

# Organization-wide Firewall Policy
resource "google_compute_organization_security_policy" "policy" {
  provider     = google-beta
  display_name = "enterprise-security-policy"
  parent      = "organizations/${var.organization_id}"
}

# Example rule for blocking known malicious IPs
resource "google_compute_organization_security_policy_rule" "block_malicious" {
  provider = google-beta
  policy   = google_compute_organization_security_policy.policy.name
  action   = "deny"
  priority = "1000"
  match {
    config {
      src_ip_ranges = var.blocked_ip_ranges
      layer4_config {
        ip_protocol = "all"
      }
    }
  }
  direction = "INGRESS"
}

# Cloud Asset Inventory
resource "google_cloud_asset_organization_feed" "asset_feed" {
  billing_project = var.project_id
  feed_id        = "security-asset-feed"
  organization   = var.organization_id

  feed_output_config {
    pubsub_destination {
      topic = google_pubsub_topic.asset_feed.id
    }
  }

  asset_types = [
    "compute.googleapis.com/Firewall",
    "compute.googleapis.com/Network",
    "container.googleapis.com/Cluster",
    "iam.googleapis.com/ServiceAccount"
  ]
}

# Pub/Sub for asset changes
resource "google_pubsub_topic" "asset_feed" {
  name = "security-asset-feed"
}

resource "google_pubsub_subscription" "asset_feed" {
  name  = "security-asset-feed-sub"
  topic = google_pubsub_topic.asset_feed.name
}

# Security Health Analytics
resource "google_scc_notification_config" "notification" {
  provider     = google-beta
  organization = var.organization_id
  config_id    = "security-notifications"
  description  = "Security findings notifications"
  pubsub_topic = google_pubsub_topic.security_findings.id

  streaming_config {
    filter = "category=\"OPEN_FIREWALL\""
  }
}

resource "google_pubsub_topic" "security_findings" {
  name = "security-findings"
}

# VPC Service Controls
resource "google_access_context_manager_access_policy" "policy" {
  provider = google-beta
  parent   = "organizations/${var.organization_id}"
  title    = "Enterprise Security Policy"
}

resource "google_access_context_manager_service_perimeter" "perimeter" {
  provider = google-beta
  parent   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name     = "restrict_services"
  title    = "Service Perimeter"
  status {
    restricted_services = [
      "storage.googleapis.com",
      "bigquery.googleapis.com"
    ]
    resources = ["projects/${var.project_id}"]
  }
}

# Cloud KMS for Encryption
resource "google_kms_key_ring" "key_ring" {
  name     = "security-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "crypto_key" {
  name     = "security-key"
  key_ring = google_kms_key_ring.key_ring.id
  purpose  = "ENCRYPT_DECRYPT"

  version_template {
    algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Web Security Scanner
resource "google_security_scanner_scan_config" "scan" {
  provider     = google-beta
  display_name = "security-scan"
  target_url   = var.target_url
  
  authentication {
    google_account {
      username = var.scanner_email
      password = var.scanner_password
    }
  }
}

# Cloud Armor Policy
resource "google_compute_security_policy" "policy" {
  name = "enterprise-security-policy"

  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = var.blocked_ip_ranges
      }
    }
    description = "Deny access to blocked IPs"
  }

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }
}

# Binary Authorization
resource "google_binary_authorization_policy" "policy" {
  admission_whitelist_patterns {
    name_pattern = "gcr.io/google_containers/*"
  }

  default_admission_rule {
    evaluation_mode  = "ALWAYS_DENY"
    enforcement_mode = "ENFORCED_BLOCK_AND_AUDIT_LOG"
  }

  global_policy_evaluation_mode = "ENABLE"
}

# Security Monitoring and Alerting
resource "google_monitoring_alert_policy" "security_alert" {
  display_name = "Security Violations Alert"
  combiner     = "OR"
  conditions {
    display_name = "Security Finding Rate"
    condition_threshold {
      filter          = "metric.type=\"securitycenter.googleapis.com/finding_count\" resource.type=\"organization\""
      duration       = "300s"
      comparison     = "COMPARISON_GT"
      threshold_value = 10
      trigger {
        count = 1
      }
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Security Notification Channel"
  type         = "email"
  labels = {
    email_address = var.security_email
  }
}

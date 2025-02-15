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

# Custom IAM Roles
resource "google_organization_iam_custom_role" "network_viewer" {
  role_id     = "networkViewer"
  org_id      = var.organization_id
  title       = "Network Infrastructure Viewer"
  description = "Custom role for viewing network infrastructure"
  permissions = [
    "compute.networks.get",
    "compute.networks.list",
    "compute.routes.list",
    "compute.routers.get",
    "compute.interconnects.get"
  ]
}

resource "google_organization_iam_custom_role" "security_admin" {
  role_id     = "securityAdmin"
  org_id      = var.organization_id
  title       = "Security Infrastructure Admin"
  description = "Custom role for managing security configurations"
  permissions = [
    "compute.securityPolicies.create",
    "compute.securityPolicies.update",
    "securitycenter.findings.list",
    "securitycenter.findings.update",
    "monitoring.alertPolicies.create"
  ]
}

resource "google_organization_iam_custom_role" "api_manager" {
  role_id     = "apiManager"
  org_id      = var.organization_id
  title       = "API Management Admin"
  description = "Custom role for managing API enablement"
  permissions = [
    "serviceusage.services.enable",
    "serviceusage.services.disable",
    "serviceusage.services.get",
    "serviceusage.services.list"
  ]
}

# Project-level IAM bindings
resource "google_project_iam_binding" "network_viewers" {
  project = var.network_project_id
  role    = google_organization_iam_custom_role.network_viewer.id
  members = var.network_viewers
}

resource "google_project_iam_binding" "security_admins" {
  project = var.security_project_id
  role    = google_organization_iam_custom_role.security_admin.id
  members = var.security_admins
}

resource "google_project_iam_binding" "api_managers" {
  project = var.network_project_id
  role    = google_organization_iam_custom_role.api_manager.id
  members = var.api_managers
}

# IAM Audit Logging
resource "google_project_iam_audit_config" "audit_log" {
  project = var.network_project_id
  service = "allServices"
  audit_log_config {
    log_type = "ADMIN_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

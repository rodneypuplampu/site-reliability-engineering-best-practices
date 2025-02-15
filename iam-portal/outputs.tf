# Outputs
output "network_viewer_role" {
  value = google_organization_iam_custom_role.network_viewer.id
}

output "security_admin_role" {
  value = google_organization_iam_custom_role.security_admin.id
}

output "api_manager_role" {
  value = google_organization_iam_custom_role.api_manager.id
}

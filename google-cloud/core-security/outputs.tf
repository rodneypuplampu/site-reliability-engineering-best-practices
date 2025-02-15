# outputs.tf
output "security_policy_id" {
  value = google_compute_organization_security_policy.policy.id
}

output "kms_key_id" {
  value = google_kms_crypto_key.crypto_key.id
}

output "security_perimeter_name" {
  value = google_access_context_manager_service_perimeter.perimeter.name
}

# outputs.tf
output "kubernetes_cluster_name" {
  value = google_container_cluster.primary.name
}

output "kubernetes_cluster_host" {
  value = google_container_cluster.primary.endpoint
}

output "alloydb_connection_name" {
  value = google_alloydb_instance.default.name
}

output "static_bucket_url" {
  value = google_storage_bucket.static.url
}

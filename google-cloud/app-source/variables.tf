# variables.tf
variable "project_id" {
  description = "GCP Project ID"
}

variable "region" {
  description = "GCP Region"
  default     = "europe-west1"
}

variable "cluster_name" {
  description = "GKE Cluster Name"
}

variable "django_secret_key" {
  description = "Django Secret Key"
  sensitive   = true
}

variable "db_password" {
  description = "AlloyDB Password"
  sensitive   = true
}

variable "alloydb_host" {
  description = "AlloyDB Host"
}

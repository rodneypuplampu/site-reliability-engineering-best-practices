# variables.tf
variable "project_id" {
  description = "The project ID to host the cluster in"
}

variable "region" {
  description = "The region to host the cluster in"
  default     = "europe-west1"
}

variable "subnet_cidr" {
  description = "The CIDR range for the subnet"
  default     = "10.0.0.0/24"
}

variable "pods_cidr" {
  description = "The CIDR range for pods"
  default     = "10.1.0.0/16"
}

variable "services_cidr" {
  description = "The CIDR range for services"
  default     = "10.2.0.0/16"
}

variable "node_count" {
  description = "Number of nodes in the node pool"
  default     = 3
}

variable "machine_type" {
  description = "Machine type for nodes"
  default     = "e2-standard-2"
}

variable "disk_size_gb" {
  description = "Disk size for nodes in GB"
  default     = 100
}

variable "db_password" {
  description = "Password for AlloyDB"
  sensitive   = true
}

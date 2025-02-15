# variables.tf
variable "project_id" {
  description = "The project ID for the security hub"
}

variable "organization_id" {
  description = "The organization ID"
}

variable "region" {
  description = "Default region"
  default     = "us-central1"
}

variable "blocked_ip_ranges" {
  description = "List of IP ranges to block"
  type        = list(string)
}

variable "target_url" {
  description = "URL to scan with Web Security Scanner"
}

variable "scanner_email" {
  description = "Email for Web Security Scanner authentication"
}

variable "scanner_password" {
  description = "Password for Web Security Scanner authentication"
  sensitive   = true
}

variable "security_email" {
  description = "Email for security notifications"
}

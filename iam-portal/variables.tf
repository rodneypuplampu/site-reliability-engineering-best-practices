# Variables
variable "organization_id" {
  description = "Organization ID"
}

variable "network_project_id" {
  description = "Network Hub Project ID"
}

variable "security_project_id" {
  description = "Security Hub Project ID"
}

variable "network_viewers" {
  description = "List of members for network viewer role"
  type        = list(string)
}

variable "security_admins" {
  description = "List of members for security admin role"
  type        = list(string)
}

variable "api_managers" {
  description = "List of members for API management role"
  type        = list(string)
}

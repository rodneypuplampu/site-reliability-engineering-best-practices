# terraform/variables.tf
variable "tfc_org_name" {
  description = "Terraform Cloud organization name"
  type        = string
}

variable "github_org" {
  description = "GitHub organization name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "oauth_token_id" {
  description = "OAuth token ID for VCS integration"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

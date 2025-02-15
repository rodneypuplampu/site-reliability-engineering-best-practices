# variables.tf
variable "project_id" {
  description = "The project ID for the network hub"
}

variable "region" {
  description = "Default region"
  default     = "us-central1"
}

variable "organization_id" {
  description = "The organization ID"
}

variable "regional_subnets" {
  description = "Map of regional subnets"
  type = map(object({
    region           = string
    cidr            = string
    secondary_ranges = map(string)
  }))
}

variable "peered_vpcs" {
  description = "Map of VPCs to peer with"
  type = map(object({
    project  = string
    vpc_name = string
  }))
}

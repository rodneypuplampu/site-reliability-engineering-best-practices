# variables.tf
variable "project_id" {
  description = "The project ID"
  type        = string
}

variable "prod_subnets" {
  description = "Production subnet configurations"
  type = map(object({
    cidr_range = string
    region     = string
    secondary_ranges = list(object({
      range_name    = string
      ip_cidr_range = string
    }))
  }))
  default = {
    "subnet-1" = {
      cidr_range = "10.0.0.0/20"
      region     = "us-central1"
      secondary_ranges = [
        {
          range_name    = "pods"
          ip_cidr_range = "10.1.0.0/16"
        },
        {
          range_name    = "services"
          ip_cidr_range = "10.2.0.0/16"
        }
      ]
    }
  }
}

variable "dev_subnets" {
  description = "Development subnet configurations"
  type = map(object({
    cidr_range = string
    region     = string
    secondary_ranges = list(object({
      range_name    = string
      ip_cidr_range = string
    }))
  }))
  default = {
    "subnet-1" = {
      cidr_range = "172.16.0.0/20"
      region     = "us-central1"
      secondary_ranges = [
        {
          range_name    = "pods"
          ip_cidr_range = "172.17.0.0/16"
        },
        {
          range_name    = "services"
          ip_cidr_range = "172.18.0.0/16"
        }
      ]
    }
  }
}

variable "staging_subnets" {
  description = "Staging subnet configurations"
  type = map(object({
    cidr_range = string
    region     = string
    secondary_ranges = list(object({
      range_name    = string
      ip_cidr_range = string
    }))
  }))
  default = {
    "subnet-1" = {
      cidr_range = "192.168.0.0/20"
      region     = "us-central1"
      secondary_ranges = [
        {
          range_name    = "pods"
          ip_cidr_range = "192.169.0.0/16"
        },
        {
          range_name    = "services"
          ip_cidr_range = "192.170.0.0/16"
        }
      ]
    }
  }
}

# variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "connect_instance_id" {
  description = "The ID of the Amazon Connect instance"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for security groups"
  type        = string
}

variable "allowed_agent_cidrs" {
  description = "Allowed CIDR blocks for agent access"
  type        = list(string)
}

# variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "instance_alias" {
  description = "The name of the Amazon Connect instance"
  type        = string
}

variable "directory_id" {
  description = "The directory ID for SAML authentication"
  type        = string
  default     = null
}

variable "instance_type" {
  description = "The type of instance (CONNECT_MANAGED or SAML)"
  type        = string
  default     = "CONNECT_MANAGED"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "inbound_calls" {
  description = "Enable inbound calls"
  type        = bool
  default     = true
}

variable "outbound_calls" {
  description = "Enable outbound calls"
  type        = bool
  default     = true
}

variable "bot_name" {
  description = "Name of the Lex bot"
  type        = string
  default     = "ConnectBot"
}

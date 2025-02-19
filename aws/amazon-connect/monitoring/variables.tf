# variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "connect_instance_id" {
  description = "Amazon Connect instance ID"
  type        = string
}

variable "salesforce_instance_url" {
  description = "Salesforce instance URL"
  type        = string
}

variable "salesforce_client_id" {
  description = "Salesforce client ID"
  type        = string
}

variable "salesforce_client_secret" {
  description = "Salesforce client secret"
  type        = string
  sensitive   = true
}

variable "splunk_hec_url" {
  description = "Splunk HEC endpoint URL"
  type        = string
}

variable "splunk_hec_token" {
  description = "Splunk HEC token"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name"
  type        = string
}

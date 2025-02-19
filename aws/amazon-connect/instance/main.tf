# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0.0"
}

provider "aws" {
  region = var.aws_region
}

module "connect_instance" {
  source = "./modules/connect_instance"

  instance_alias   = var.instance_alias
  directory_id     = var.directory_id
  instance_type    = var.instance_type
  environment      = var.environment
  inbound_calls    = var.inbound_calls
  outbound_calls   = var.outbound_calls
  contact_flows    = var.contact_flows
}

module "lambda_functions" {
  source = "./modules/lambda_functions"

  connect_instance_id = module.connect_instance.instance_id
  environment        = var.environment
}

module "lex_bot" {
  source = "./modules/lex_bot"

  connect_instance_id = module.connect_instance.instance_id
  bot_name           = var.bot_name
  environment        = var.environment
}

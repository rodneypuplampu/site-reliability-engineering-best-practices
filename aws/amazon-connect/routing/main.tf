# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Create Hours of Operation
resource "aws_connect_hours_of_operation" "business_hours" {
  instance_id = var.connect_instance_id
  name        = "Business Hours"
  description = "Standard business hours"
  timezone    = "America/New_York"

  config {
    day = "MONDAY"
    end_time {
      hours   = 17
      minutes = 0
    }
    start_time {
      hours   = 9
      minutes = 0
    }
  }
  # Repeat for other business days...
}

# Chat Queues
resource "aws_connect_queue" "chat_queues" {
  for_each = toset(["chat1", "chat2", "chat3"])

  instance_id           = var.connect_instance_id
  name                  = "${each.key}-queue"
  description          = "Queue for ${each.key} interactions"
  hours_of_operation_id = aws_connect_hours_of_operation.business_hours.hours_of_operation_id

  tags = {
    Type = "Chat"
    Group = each.key
  }
}

# Voice Inbound Queues
resource "aws_connect_queue" "voice_queues" {
  for_each = toset(["voice1", "voice2", "voice3"])

  instance_id           = var.connect_instance_id
  name                  = "${each.key}-queue"
  description          = "Queue for ${each.key} voice calls"
  hours_of_operation_id = aws_connect_hours_of_operation.business_hours.hours_of_operation_id

  tags = {
    Type = "Voice"
    Group = each.key
  }
}

# Outbound Voice Queues
resource "aws_connect_queue" "outbound_queues" {
  for_each = toset(["outvoice1", "outvoice2"])

  instance_id           = var.connect_instance_id
  name                  = "${each.key}-queue"
  description          = "Queue for ${each.key} outbound calls"
  hours_of_operation_id = aws_connect_hours_of_operation.business_hours.hours_of_operation_id

  tags = {
    Type = "Outbound"
    Group = each.key
  }
}

# Routing Profiles
resource "aws_connect_routing_profile" "chat_profiles" {
  for_each = toset(["chat1", "chat2", "chat3"])

  instance_id = var.connect_instance_id
  name        = "${each.key}-routing-profile"
  description = "Routing profile for ${each.key} agents"
  
  default_outbound_queue_id = aws_connect_queue.outbound_queues["outvoice1"].queue_id

  media_concurrencies {
    channel     = "CHAT"
    concurrency = 3
  }

  queue_configs {
    channel  = "CHAT"
    delay    = 0
    priority = 1
    queue_id = aws_connect_queue.chat_queues[each.key].queue_id
  }
}

resource "aws_connect_routing_profile" "voice_profiles" {
  for_each = toset(["voice1", "voice2", "voice3"])

  instance_id = var.connect_instance_id
  name        = "${each.key}-routing-profile"
  description = "Routing profile for ${each.key} voice agents"
  
  default_outbound_queue_id = aws_connect_queue.outbound_queues["outvoice1"].queue_id

  media_concurrencies {
    channel     = "VOICE"
    concurrency = 1
  }

  queue_configs {
    channel  = "VOICE"
    delay    = 0
    priority = 1
    queue_id = aws_connect_queue.voice_queues[each.key].queue_id
  }
}

# Contact Flows
resource "aws_connect_contact_flow" "chat_flow" {
  instance_id = var.connect_instance_id
  name        = "Chat Contact Flow"
  description = "Main flow for chat interactions"
  type        = "CONTACT_FLOW"
  content     = jsonencode({
    Version = "2019-10-30"
    StartAction = "12345678-1234-1234-1234-123456789012"
    Actions = [
      {
        Identifier = "12345678-1234-1234-1234-123456789012"
        Type = "TransferToQueue"
        Parameters = {
          QueueId = aws_connect_queue.chat_queues["chat1"].queue_id
        }
      }
    ]
  })
}

resource "aws_connect_contact_flow" "voice_flow" {
  instance_id = var.connect_instance_id
  name        = "Voice Contact Flow"
  description = "Main flow for voice interactions"
  type        = "CONTACT_FLOW"
  content     = jsonencode({
    Version = "2019-10-30"
    StartAction = "12345678-1234-1234-1234-123456789012"
    Actions = [
      {
        Identifier = "12345678-1234-1234-1234-123456789012"
        Type = "TransferToQueue"
        Parameters = {
          QueueId = aws_connect_queue.voice_queues["voice1"].queue_id
        }
      }
    ]
  })
}

# Security Groups (for agent access)
resource "aws_security_group" "connect_agents" {
  name        = "connect-agents"
  description = "Security group for Connect agents"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_agent_cidrs
  }
}

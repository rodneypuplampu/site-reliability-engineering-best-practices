# modules/connect_instance/main.tf
resource "aws_connect_instance" "main" {
  identity_management_type = var.directory_id != null ? "SAML" : "CONNECT_MANAGED"
  instance_alias          = var.instance_alias
  directory_id           = var.directory_id
  inbound_calls_enabled  = var.inbound_calls
  outbound_calls_enabled = var.outbound_calls

  tags = {
    Environment = var.environment
  }
}

resource "aws_connect_hours_of_operation" "main" {
  instance_id = aws_connect_instance.main.id
  name        = "Default Hours of Operation"
  description = "Default 24/7 hours of operation"
  timezone    = "UTC"

  config {
    day = "MONDAY"
    end_time {
      hours   = 23
      minutes = 59
    }
    start_time {
      hours   = 0
      minutes = 0
    }
  }
  # Repeat for other days...
}

resource "aws_connect_queue" "main" {
  instance_id           = aws_connect_instance.main.id
  name                  = "DefaultQueue"
  description          = "Default contact queue"
  hours_of_operation_id = aws_connect_hours_of_operation.main.hours_of_operation_id
}

resource "aws_connect_routing_profile" "main" {
  instance_id = aws_connect_instance.main.id
  name        = "DefaultRoutingProfile"
  description = "Default routing profile"
  default_outbound_queue_id = aws_connect_queue.main.queue_id

  media_concurrencies {
    channel     = "VOICE"
    concurrency = 1
  }

  queue_configs {
    channel  = "VOICE"
    delay    = 0
    priority = 1
    queue_id = aws_connect_queue.main.queue_id
  }
}

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

# Salesforce Lambda Integration
resource "aws_lambda_function" "salesforce_integration" {
  filename         = "salesforce_integration.zip"
  function_name    = "connect-salesforce-integration"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"

  environment {
    variables = {
      SALESFORCE_INSTANCE_URL = var.salesforce_instance_url
      SALESFORCE_CLIENT_ID    = var.salesforce_client_id
      SALESFORCE_SECRET       = var.salesforce_client_secret
    }
  }
}

# Lambda IAM Role
resource "aws_iam_role" "lambda_role" {
  name = "connect-salesforce-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Splunk Integration
resource "aws_kinesis_firehose_delivery_stream" "splunk_stream" {
  name        = "connect-to-splunk-stream"
  destination = "http_endpoint"

  http_endpoint_configuration {
    url                = var.splunk_hec_url
    name              = "Splunk"
    access_key        = var.splunk_hec_token
    buffering_size    = 5
    buffering_interval = 300
    role_arn          = aws_iam_role.firehose_role.arn
    s3_backup_mode    = "FailedDataOnly"

    request_configuration {
      content_encoding = "GZIP"
    }
  }

  s3_configuration {
    role_arn   = aws_iam_role.firehose_role.arn
    bucket_arn = aws_s3_bucket.backup_bucket.arn
  }
}

# Contact Lens Configuration
resource "aws_connect_instance_storage_config" "contact_lens" {
  instance_id = var.connect_instance_id
  resource_type = "CONTACT_TRACE_RECORDS"

  storage_config {
    storage_type = "KINESIS_FIREHOSE"
    kinesis_firehose_config {
      firehose_arn = aws_kinesis_firehose_delivery_stream.splunk_stream.arn
    }
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "connect_dashboard" {
  dashboard_name = "connect-monitoring-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Connect", "ContactsHandled", "InstanceId", var.connect_instance_id],
            ["AWS/Connect", "ContactsAbandoned", "InstanceId", var.connect_instance_id],
            ["AWS/Connect", "AverageHandlingTime", "InstanceId", var.connect_instance_id]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Contact Center Performance"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Connect", "CallsPerInterval", "InstanceId", var.connect_instance_id],
            ["AWS/Connect", "MissedCalls", "InstanceId", var.connect_instance_id]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Call Volume Metrics"
        }
      }
    ]
  })
}

# Contact Center Insights
resource "aws_connectparticipant_insights_configuration" "main" {
  instance_id = var.connect_instance_id
  enabled     = true

  features {
    post_call_analytics {
      enabled = true
    }
    real_time_analytics {
      enabled = true
    }
  }
}

# Monitoring Alarms
resource "aws_cloudwatch_metric_alarm" "high_abandon_rate" {
  alarm_name          = "high-abandon-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ContactsAbandoned"
  namespace           = "AWS/Connect"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High call abandon rate detected"
  alarm_actions      = [aws_sns_topic.connect_alerts.arn]

  dimensions = {
    InstanceId = var.connect_instance_id
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "connect_alerts" {
  name = "connect-monitoring-alerts"
}

# Log Groups
resource "aws_cloudwatch_log_group" "connect_logs" {
  name              = "/aws/connect/${var.connect_instance_id}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Service     = "Amazon Connect"
  }
}

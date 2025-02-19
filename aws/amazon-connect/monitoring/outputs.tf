# outputs.tf
output "lambda_function_arn" {
  description = "ARN of the Salesforce integration Lambda function"
  value       = aws_lambda_function.salesforce_integration.arn
}

output "firehose_stream_arn" {
  description = "ARN of the Kinesis Firehose delivery stream"
  value       = aws_kinesis_firehose_delivery_stream.splunk_stream.arn
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.connect_dashboard.dashboard_name
}

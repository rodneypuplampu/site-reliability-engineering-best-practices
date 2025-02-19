# outputs.tf
output "connect_instance_id" {
  description = "The ID of the Connect instance"
  value       = module.connect_instance.instance_id
}

output "connect_instance_arn" {
  description = "The ARN of the Connect instance"
  value       = module.connect_instance.instance_arn
}

output "queue_arn" {
  description = "The ARN of the default queue"
  value       = module.connect_instance.queue_arn
}

output "lambda_function_arn" {
  description = "The ARN of the contact flow handler Lambda function"
  value       = module.lambda_functions.function_arn
}

output "lex_bot_arn" {
  description = "The ARN of the Lex bot"
  value       = module.lex_bot.bot_arn
}

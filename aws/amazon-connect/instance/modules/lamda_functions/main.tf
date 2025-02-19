# modules/lambda_functions/main.tf
resource "aws_iam_role" "lambda" {
  name = "connect-lambda-role-${var.environment}"

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

resource "aws_lambda_function" "contact_flow_handler" {
  filename         = "contact_flow_handler.zip"
  function_name    = "connect-contact-flow-handler-${var.environment}"
  role            = aws_iam_role.lambda.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"

  environment {
    variables = {
      CONNECT_INSTANCE_ID = var.connect_instance_id
    }
  }
}

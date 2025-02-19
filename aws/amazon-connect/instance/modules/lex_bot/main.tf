# modules/lex_bot/main.tf
resource "aws_lex_bot" "main" {
  name = var.bot_name
  description = "Amazon Connect Bot"
  process_behavior = "BUILD"
  child_directed = false
  idle_session_ttl_in_seconds = 300

  abort_statement {
    message {
      content = "Sorry, I couldn't understand. Please try again."
      content_type = "PlainText"
    }
  }

  clarification_prompt {
    max_attempts = 2
    message {
      content = "I didn't understand you. Could you please repeat that?"
      content_type = "PlainText"
    }
  }
}

resource "aws_lex_bot_alias" "main" {
  bot_name = aws_lex_bot.main.name
  bot_version = aws_lex_bot.main.version
  description = "Alias for Connect bot"
  name = "connect_${var.environment}"
}

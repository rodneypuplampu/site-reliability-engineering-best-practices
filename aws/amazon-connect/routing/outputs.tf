# outputs.tf
output "chat_queue_ids" {
  description = "IDs of chat queues"
  value = {
    for k, v in aws_connect_queue.chat_queues : k => v.queue_id
  }
}

output "voice_queue_ids" {
  description = "IDs of voice queues"
  value = {
    for k, v in aws_connect_queue.voice_queues : k => v.queue_id
  }
}

output "outbound_queue_ids" {
  description = "IDs of outbound queues"
  value = {
    for k, v in aws_connect_queue.outbound_queues : k => v.queue_id
  }
}

output "routing_profile_ids" {
  description = "IDs of routing profiles"
  value = merge(
    { for k, v in aws_connect_routing_profile.chat_profiles : k => v.routing_profile_id },
    { for k, v in aws_connect_routing_profile.voice_profiles : k => v.routing_profile_id }
  )
}

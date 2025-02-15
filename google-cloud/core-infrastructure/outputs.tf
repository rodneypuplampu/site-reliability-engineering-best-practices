# outputs.tf
output "vpc_network" {
  value = google_compute_network.hub_vpc.self_link
}

output "subnetworks" {
  value = {
    for subnet in google_compute_subnetwork.regional_subnets :
    subnet.name => subnet.self_link
  }
}

output "interconnect_attachment" {
  value = google_compute_interconnect_attachment.interconnect.self_link
}

output "nat_ip" {
  value = google_compute_router_nat.nat.nat_ips
}

output "cdn_backend" {
  value = google_compute_backend_bucket.cdn_backend.self_link
}

# outputs.tf
output "prod_subnets" {
  value = {
    for name, subnet in google_compute_subnetwork.prod_subnets :
    name => {
      id         = subnet.id
      cidr_range = subnet.ip_cidr_range
      region     = subnet.region
    }
  }
}

output "dev_subnets" {
  value = {
    for name, subnet in google_compute_subnetwork.dev_subnets :
    name => {
      id         = subnet.id
      cidr_range = subnet.ip_cidr_range
      region     = subnet.region
    }
  }
}

output "staging_subnets" {
  value = {
    for name, subnet in google_compute_subnetwork.staging_subnets :
    name => {
      id         = subnet.id
      cidr_range = subnet.ip_cidr_range
      region     = subnet.region
    }
  }
}

# Amazon Connect Active-Active Multi-Region Deployment Guide

## Overview

This repository contains Terraform configurations for setting up an active-active Amazon Connect deployment across two AWS regions with bidirectional failover capabilities. This architecture ensures high availability for contact center operations by allowing both regions to handle calls simultaneously and enabling automatic failover in case of regional outages.



## Key Components

1. **Amazon Connect Instances**: Primary and secondary instances in different AWS regions
2. **Traffic Distribution Groups (TDGs)**: Enable call distribution between regions
3. **Data Synchronization**: Real-time replication of contact data through Kinesis streams
4. **Agent State Synchronization**: DynamoDB global tables for agent state management
5. **Bidirectional Failover**: Lambda function that monitors instance health and adjusts traffic distribution
6. **Network Connectivity**: Direct Connect with VPN backup through GCP
7. **Monitoring & Alerting**: CloudWatch metrics and alarms for health monitoring

## Prerequisites

- AWS account with permissions to create all required resources
- GCP account (if implementing the interconnect through GCP)
- Terraform 0.14+ installed
- AWS CLI configured with appropriate credentials


## Implementation Steps

### Step 1: Create the TF Code.

Edit the `terraform.tfvars` file to set your specific variables:

```hcl
primary_region = "us-east-1"
secondary_region = "us-west-2"
primary_connect_instance_alias = "my-connect-primary"
secondary_connect_instance_alias = "my-connect-secondary"
primary_phone_number = "+1234567890"
secondary_phone_number = "+1987654321"
vpc_cidr_primary = "10.0.0.0/16"
vpc_cidr_secondary = "10.1.0.0/16"
default_traffic_distribution = {
  primary_percentage = 50
  secondary_percentage = 50
}
gcp_project_id = "my-gcp-project"
```

### Step 2: Initialize Terraform

```bash
terraform init
```

### Step 3: Deploy AWS Resources

```bash
terraform apply -target=module.aws_connect
```

This will create:
- Amazon Connect instances in both regions
- VPCs and subnets
- Traffic Distribution Groups
- Kinesis streams
- DynamoDB global tables
- Lambda function for health checks

### Step 4: Deploy GCP Resources (if using GCP interconnect)

```bash
terraform apply -target=module.gcp_cloud_router
```

This will create:
- GCP network infrastructure
- Cloud Routers
- Partner Interconnect attachments
- Firewall rules
- VPN Gateway

### Step 5: Configure Interconnect Between AWS and GCP

```bash
terraform apply -target=module.aws_gcp_interconnect
```

This will create the connections between AWS and GCP:
- Direct Connect Gateways
- Private Virtual Interfaces
- Customer Gateways
- Site-to-Site VPN connections

### Step 6: Configure Amazon Connect Contact Flows

```bash
terraform apply -target=module.contact_routing_config
```

This will create identical contact flows in both regions:
- Inbound flows
- Queues
- Hours of operation
- Agent configurations

### Step 7: Test the Deployment

1. **Test Normal Operation**:
   - Place test calls to both phone numbers
   - Verify calls are distributed according to your configuration
   - Verify agent states are synchronized

2. **Test Failover Scenario**:
   - Simulate a regional outage (you can temporarily disable the primary Connect instance)
   - Verify calls automatically route to the secondary region
   - Verify the Lambda function updates traffic distribution

3. **Test Recovery**:
   - Restore the primary region
   - Verify the system automatically returns to the default traffic distribution

## Detailed Component Configuration

### Amazon Connect Instances

Each Connect instance is configured with:
- Inbound and outbound calling enabled
- Contact flow logs enabled
- Dedicated phone numbers
- Storage configuration for Contact Trace Records (CTRs)

### Traffic Distribution Groups

TDGs are configured to allow traffic to flow between regions with:
- Default split of 50/50 (configurable)
- Automatic adjustment based on instance health

### Health Check Lambda Function

The Lambda function performs:
- Health checks on both Connect instances every minute
- Traffic distribution adjustments based on instance health
- Automatic recovery when failed resources come back online

The function handles multiple scenarios:
- Both regions healthy → Maintain default distribution
- Primary region unhealthy → Route all traffic to secondary
- Secondary region unhealthy → Route all traffic to primary
- Both regions unhealthy → Alert but cannot take action

### Network Connectivity

The network setup provides redundant connectivity with:
- Primary connectivity via AWS Direct Connect and GCP Partner Interconnect
- Backup connectivity via Site-to-Site VPN
- BGP for dynamic routing between regions

### Data Synchronization

Data synchronization ensures consistent operation with:
- Contact Trace Records synchronized via Kinesis streams
- Agent states synchronized via DynamoDB global tables
- Queues and contact flows maintained with identical configurations

## Important Considerations

1. **Cost Management**:
   - Running active-active Connect instances increases costs
   - Direct Connect and VPN connections incur ongoing charges
   - Lambda invocations and data transfer between regions add to costs

2. **Regulatory Compliance**:
   - Ensure multi-region setup complies with data residency requirements
   - Consider implementing regional controls for sensitive data

3. **Agent Management**:
   - Train agents on procedures during failover events
   - Consider using agent groups that align with regional assignments

4. **Testing and Maintenance**:
   - Schedule regular failover testing
   - Document recovery procedures
   - Create a backup and restoration strategy for configuration

## Troubleshooting

### Common Issues

1. **Traffic Distribution Not Working**:
   - Verify TDG configuration
   - Check Lambda execution logs
   - Ensure Connect instances have necessary permissions

2. **Data Synchronization Delays**:
   - Check Kinesis stream metrics
   - Verify DynamoDB replication status
   - Increase provisioned capacity if needed

3. **Network Connectivity Problems**:
   - Verify BGP session status
   - Check VPN tunnel status
   - Test connectivity between regions

### Monitoring Recommendations

- Create CloudWatch dashboards for key metrics
- Set up alerts for critical thresholds
- Monitor Lambda execution and error rates
- Track call quality metrics across regions

## Extending the Architecture

### Additional Regions

To add more regions:
1. Duplicate the region-specific resources in the new region
2. Update the Traffic Distribution Groups to include the new region
3. Expand the Lambda function logic to handle the additional region
4. Extend the network connectivity to the new region

### Enhanced Features

Consider these additional features:
- Geo-routing based on caller location
- Follow-the-sun routing for global operations
- Regional specialization for specific languages or skills
- Machine learning-based traffic optimization

## Support and Resources

- [Amazon Connect Documentation](https://docs.aws.amazon.com/connect/)
- [Multi-Region Architecture Best Practices](https://aws.amazon.com/architecture/multi-region/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS Direct Connect Documentation](https://docs.aws.amazon.com/directconnect/)



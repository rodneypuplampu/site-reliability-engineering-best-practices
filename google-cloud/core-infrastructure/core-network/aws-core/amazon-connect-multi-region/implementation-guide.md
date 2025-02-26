# Step-by-Step Implementation Guide for Amazon Connect Active-Active Architecture

This guide provides detailed implementation steps for setting up the active-active Amazon Connect deployment with bidirectional failover capability across multiple regions.

## Phase 1: Planning and Preparation

### Step 1: Design Assessment and Requirements Gathering
- [ ] Identify call volume and distribution patterns
- [ ] Determine required agent capacity per region
- [ ] Document compliance and regulatory requirements
- [ ] Define failover triggers and thresholds
- [ ] Set Recovery Time Objective (RTO) and Recovery Point Objective (RPO)

### Step 2: AWS Account Setup
- [ ] Ensure administrative access to AWS accounts
- [ ] Verify service limits for Amazon Connect in target regions
- [ ] Request limit increases if necessary
- [ ] Set up AWS Organizations for multi-account strategy (if applicable)
- [ ] Configure appropriate IAM roles and permissions

### Step 3: GCP Setup (if using GCP interconnect)
- [ ] Create GCP project
- [ ] Enable necessary APIs (Compute Engine, Cloud Router, etc.)
- [ ] Set up IAM permissions
- [ ] Configure billing alerts

### Step 4: Prepare Terraform Environment
- [ ] Install Terraform 0.14+ locally or set up CI/CD pipeline
- [ ] Configure AWS and GCP credentials
- [ ] Set up a secure location for storing state files (S3, GCS, or Terraform Cloud)
- [ ] Create a version control repository for Terraform configuration

## Phase 2: Infrastructure Deployment

### Step 5: Deploy Basic Network Infrastructure
- [ ] Create directory structure:
  ```
  amazon-connect-active-active/
  ├── main.tf
  ├── variables.tf
  ├── outputs.tf
  ├── terraform.tfvars
  ├── modules/
  │   ├── aws_connect/
  │   ├── gcp_cloud_router/
  │   ├── aws_gcp_interconnect/
  │   └── contact_routing_config/
  ```
- [ ] Set up provider configurations:
  ```bash
  cd amazon-connect-active-active
  terraform init
  ```
- [ ] Deploy VPCs and subnets in both regions:
  ```bash
  terraform apply -target=aws_vpc.primary -target=aws_vpc.secondary
  terraform apply -target=aws_subnet.primary_subnet_1 -target=aws_subnet.primary_subnet_2 -target=aws_subnet.secondary_subnet_1 -target=aws_subnet.secondary_subnet_2
  ```

### Step 6: Deploy Amazon Connect Instances
- [ ] Create the primary Connect instance:
  ```bash
  terraform apply -target=aws_connect_instance.primary
  ```
- [ ] Create the secondary Connect instance:
  ```bash
  terraform apply -target=aws_connect_instance.secondary
  ```
- [ ] Claim phone numbers for both instances:
  ```bash
  terraform apply -target=aws_connect_phone_number.primary -target=aws_connect_phone_number.secondary
  ```
- [ ] Set up Kinesis streams for data synchronization:
  ```bash
  terraform apply -target=aws_kinesis_stream.primary_ctr_stream -target=aws_kinesis_stream.secondary_ctr_stream
  ```
- [ ] Configure Connect instance storage:
  ```bash
  terraform apply -target=aws_connect_instance_storage_config.primary_kinesis -target=aws_connect_instance_storage_config.secondary_kinesis
  ```

### Step 7: Set Up Traffic Distribution
- [ ] Create Traffic Distribution Groups:
  ```bash
  terraform apply -target=aws_connect_traffic_distribution_group.primary_to_secondary -target=aws_connect_traffic_distribution_group.secondary_to_primary
  ```
- [ ] Configure initial traffic distribution:
  ```bash
  terraform apply -target=aws_connect_traffic_distribution.primary_distribution -target=aws_connect_traffic_distribution.secondary_distribution
  ```

### Step 8: Deploy GCP Network Resources (if using GCP interconnect)
- [ ] Create GCP network:
  ```bash
  terraform apply -target=google_compute_network.gcp_network
  ```
- [ ] Create GCP subnets:
  ```bash
  terraform apply -target=google_compute_subnetwork.connect_subnet_primary -target=google_compute_subnetwork.connect_subnet_secondary
  ```
- [ ] Set up Cloud Routers:
  ```bash
  terraform apply -target=google_compute_router.primary_cloud_router -target=google_compute_router.secondary_cloud_router
  ```
- [ ] Create interconnect attachments:
  ```bash
  terraform apply -target=google_compute_interconnect_attachment.primary_interconnect -target=google_compute_interconnect_attachment.secondary_interconnect
  ```

### Step 9: Establish Interconnect Between AWS and GCP
- [ ] Create VPN gateways:
  ```bash
  terraform apply -target=aws_vpn_gateway.primary -target=aws_vpn_gateway.secondary
  ```
- [ ] Attach VPN gateways to VPCs:
  ```bash
  terraform apply -target=aws_vpn_gateway_attachment.primary -target=aws_vpn_gateway_attachment.secondary
  ```
- [ ] Set up Direct Connect gateways:
  ```bash
  terraform apply -target=aws_dx_gateway.primary -target=aws_dx_gateway.secondary
  ```
- [ ] Create Direct Connect connections:
  ```bash
  terraform apply -target=aws_dx_connection.primary -target=aws_dx_connection.secondary
  ```
- [ ] Set up private virtual interfaces:
  ```bash
  terraform apply -target=aws_dx_private_virtual_interface.primary -target=aws_dx_private_virtual_interface.secondary
  ```
- [ ] Configure VPN as backup:
  ```bash
  terraform apply -target=google_compute_vpn_gateway.ha_vpn_gateway -target=google_compute_vpn_tunnel.ha_vpn_primary_aws -target=google_compute_vpn_tunnel.ha_vpn_secondary_aws
  ```

### Step 10: Configure Agent Synchronization
- [ ] Create DynamoDB global table:
  ```bash
  terraform apply -target=aws_dynamodb_table.agent_states_sync
  ```
- [ ] Verify replication status:
  ```bash
  aws dynamodb describe-table --table-name connect-agent-states --region us-east-1
  aws dynamodb describe-table --table-name connect-agent-states --region us-west-2
  ```

## Phase 3: Failover Automation

### Step 11: Deploy Failover Lambda Function
- [ ] Create IAM roles and policies:
  ```bash
  terraform apply -target=aws_iam_role.connect_health_check_role -target=aws_iam_policy.connect_failover_policy -target=aws_iam_role_policy_attachment.connect_failover_attachment
  ```
- [ ] Prepare Lambda deployment package:
  ```bash
  cd lambda
  zip -r lambda_function.zip index.js
  mv lambda_function.zip ..
  cd ..
  ```
- [ ] Deploy Lambda function:
  ```bash
  terraform apply -target=aws_lambda_function.connect_bidirectional_failover
  ```
- [ ] Set up CloudWatch trigger:
  ```bash
  terraform apply -target=aws_cloudwatch_event_rule.connect_health_check -target=aws_cloudwatch_event_target.connect_health_check -target=aws_lambda_permission.connect_health_check
  ```

### Step 12: Set Up Monitoring and Alerting
- [ ] Create CloudWatch alarms:
  ```bash
  terraform apply -target=aws_cloudwatch_metric_alarm.primary_connect_health -target=aws_cloudwatch_metric_alarm.secondary_connect_health
  ```
- [ ] Set up GCP monitoring (if using GCP):
  ```bash
  terraform apply -target=google_compute_health_check.interconnect_health_check -target=google_monitoring_alert_policy.interconnect_alert
  ```

## Phase 4: Amazon Connect Configuration

### Step 13: Configure Contact Flows
- [ ] Deploy basic contact flows:
  ```bash
  terraform apply -target=aws_connect_contact_flow.primary_inbound_flow
  ```
- [ ] Configure queues:
  ```bash
  terraform apply -target=aws_connect_queue.primary_queues
  ```
- [ ] Set up hours of operation:
  ```bash
  terraform apply -target=aws_connect_hours_of_operation.standard_hours
  ```
- [ ] Ensure identical configuration in both regions

### Step 14: Set Up Agent Hierarchy and Routing Profiles
- [ ] Configure agent hierarchy:
  - Log in to Amazon Connect admin console in both regions
  - Navigate to Users → User Management → Hierarchy
  - Create identical hierarchy structure in both regions
- [ ] Set up routing profiles:
  - Navigate to Users → Routing Profiles
  - Create identical routing profiles in both regions
  - Ensure proper channel and queue assignments

## Phase 5: Testing and Validation

### Step 15: Basic Functionality Testing
- [ ] Test inbound calls to primary region:
  - Make test calls to primary phone number
  - Verify proper IVR behavior
  - Confirm routing to appropriate queues
- [ ] Test inbound calls to secondary region:
  - Make test calls to secondary phone number
  - Verify same behavior as primary region

### Step 16: Failover Testing
- [ ] Test primary region failure:
  ```bash
  # Using AWS CLI to disable the primary Connect instance temporarily
  aws connect update-instance-attribute --instance-id <primary-instance-id> --attribute-type INBOUND_CALLS --value false --region <primary-region>
  
  # Monitor Lambda logs
  aws logs filter-log-events --log-group-name /aws/lambda/ConnectBidirectionalFailover --region <primary-region>
  ```
  - Verify calls route to secondary region
  - Check CloudWatch metrics

- [ ] Test secondary region failure:
  ```bash
  # Using AWS CLI to disable the secondary Connect instance temporarily
  aws connect update-instance-attribute --instance-id <secondary-instance-id> --attribute-type INBOUND_CALLS --value false --region <secondary-region>
  
  # Monitor Lambda logs
  aws logs filter-log-events --log-group-name /aws/lambda/ConnectBidirectionalFailover --region <primary-region>
  ```
  - Verify calls route to primary region
  - Check CloudWatch metrics

- [ ] Test recovery:
  ```bash
  # Re-enable both instances
  aws connect update-instance-attribute --instance-id <primary-instance-id> --attribute-type INBOUND_CALLS --value true --region <primary-region>
  aws connect update-instance-attribute --instance-id <secondary-instance-id> --attribute-type INBOUND_CALLS --value true --region <secondary-region>
  ```
  - Verify traffic returns to default distribution
  - Check CloudWatch metrics

### Step 17: Network Connectivity Testing
- [ ] Test Direct Connect paths:
  ```bash
  # Find EC2 instances in each region to use for testing
  aws ec2 describe-instances --region <primary-region>
  aws ec2 describe-instances --region <secondary-region>
  
  # Test connectivity from each region
  ssh ec2-user@<primary-ec2-ip> "ping <secondary-private-ip>"
  ssh ec2-user@<secondary-ec2-ip> "ping <primary-private-ip>"
  ```

- [ ] Test VPN backup:
  ```bash
  # Temporarily disable Direct Connect
  aws directconnect update-virtual-interface-attributes --virtual-interface-id <vif-id> --enabled false --region <primary-region>
  
  # Test connectivity again
  ssh ec2-user@<primary-ec2-ip> "ping <secondary-private-ip>"
  
  # Re-enable Direct Connect
  aws directconnect update-virtual-interface-attributes --virtual-interface-id <vif-id> --enabled true --region <primary-region>
  ```

## Phase 6: Production Deployment and Documentation

### Step 18: Final Configuration and Go-Live
- [ ] Review and finalize configuration:
  ```bash
  terraform plan
  terraform apply
  ```
- [ ] Document deployed architecture:
  - Create detailed architecture diagrams
  - Document all configuration settings
  - Create runbooks for operations team

### Step 19: Agent Training and Onboarding
- [ ] Prepare agent training materials:
  - Login procedures for both regions
  - Operations during normal conditions
  - Procedures during failover events
- [ ] Conduct agent training sessions
- [ ] Perform test calls with agents

### Step 20: Operational Monitoring Setup
- [ ] Create operational dashboards:
  - Set up CloudWatch dashboards
  - Configure alerting notifications
  - Establish escalation procedures
- [ ] Document routine maintenance procedures:
  - Update windows
  - Backup procedures
  - Regular testing schedule

## Phase 7: Ongoing Maintenance

### Step 21: Regular Testing Schedule
- [ ] Set up a monthly testing schedule:
  - Simulate regional failures
  - Test network failover
  - Verify monitoring and alerting
  - Update documentation

### Step 22: Continuous Improvement
- [ ] Implement review process:
  - Analyze performance metrics
  - Review failover logs
  - Identify optimization opportunities
- [ ] Update architecture as needed:
  ```bash
  # Pull latest changes
  git pull
  
  # Apply updates
  terraform apply
  ```

## Important Commands Reference

### AWS CLI
```bash
# Check Connect instance status
aws connect describe-instance --instance-id <instance-id> --region <region>

# List all Connect instances
aws connect list-instances --region <region>

# Check traffic distribution status
aws connect describe-traffic-distribution-group --traffic-distribution-group-id <tdg-id> --region <region>

# Update traffic distribution
aws connect update-traffic-distribution --id <tdg-id> --traffic-distribution-config '{"Distribution":[{"Region":"us-east-1","Percentage":100},{"Region":"us-west-2","Percentage":0}]}' --region <region>

# Check Lambda logs
aws logs filter-log-events --log-group-name /aws/lambda/ConnectBidirectionalFailover --region <region>

# Check DynamoDB replication
aws dynamodb describe-table --table-name connect-agent-states --region <region>
```

### Terraform
```bash
# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply all changes
terraform apply

# Apply specific resource
terraform apply -target=aws_connect_instance.primary

# Destroy resources
terraform destroy

# Refresh state
terraform refresh

# Output specific value
terraform output primary_connect_instance_id
```

### GCP CLI (if using GCP interconnect)
```bash
# Check interconnect attachment status
gcloud compute interconnects attachments describe primary-interconnect-attachment --region us-central1

# Check Cloud Router status
gcloud compute routers get-status primary-cloud-router --region us-central1

# Check VPN tunnel status
gcloud compute vpn-tunnels describe ha-vpn-primary-aws --region us-central1
```

## Troubleshooting Common Issues

### Direct Connect issues
1. Check Virtual Interface status:
   ```bash
   aws directconnect describe-virtual-interfaces --region <region>
   ```
2. Verify BGP status:
   ```bash
   aws directconnect describe-virtual-interface-health --virtual-interface-id <vif-id> --region <region>
   ```

### Traffic Distribution issues
1. Check TDG configuration:
   ```bash
   aws connect describe-traffic-distribution-group --traffic-distribution-group-id <tdg-id> --region <region>
   ```
2. Review Lambda execution logs:
   ```bash
   aws logs filter-log-events --log-group-name /aws/lambda/ConnectBidirectionalFailover --filter-pattern "ERROR" --region <region>
   ```

### Network Connectivity issues
1. Check VPN tunnel status:
   ```bash
   aws ec2 describe-vpn-connections --region <region>
   ```
2. Test connectivity between regions:
   ```bash
   # From EC2 instance in primary region
   ping <ip-in-secondary-region>
   traceroute <ip-in-secondary-region>
   ```

### Connect Instance issues
1. Verify instance status:
   ```bash
   aws connect describe-instance --instance-id <instance-id> --region <region>
   ```
2. Check agent status:
   ```bash
   aws connect describe-user --instance-id <instance-id> --user-id <user-id> --region <region>
   ```

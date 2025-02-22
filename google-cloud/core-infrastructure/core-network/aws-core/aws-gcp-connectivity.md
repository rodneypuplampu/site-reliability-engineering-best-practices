# AWS to Google Cloud Network Infrastructure Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [AWS Direct Connect Setup](#aws-direct-connect-setup)
3. [AWS VPC Configuration](#aws-vpc-configuration)
4. [Google Cloud Configuration](#google-cloud-configuration)
5. [BGP Configuration](#bgp-configuration)
6. [Security Policies](#security-policies)
7. [Monitoring and Operations](#monitoring-and-operations)

## Prerequisites

### Environment Variables
```bash
# AWS Environment Variables
export AWS_REGION="us-east-1"
export AWS_VPC_CIDR="172.16.0.0/16"
export AWS_ASN="65003"
export AWS_ACCOUNT_ID="YOUR_AWS_ACCOUNT_ID"

# Google Cloud Environment Variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-east1"
export GCP_VPC_CIDR="10.0.0.0/16"
export GCP_ASN="65001"
```

### Required Permissions
```json
# AWS IAM Policy
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "directconnect:*",
                "ec2:*",
                "route53:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## AWS Direct Connect Setup

### 1. Order Direct Connect

```bash
# Create Direct Connect connection
aws directconnect create-connection \
    --location "EqDC2" \
    --bandwidth "10Gbps" \
    --connection-name "gcp-direct-connect" \
    --region ${AWS_REGION}

# Get connection ID
DC_CONNECTION_ID=$(aws directconnect describe-connections \
    --region ${AWS_REGION} \
    --query 'connections[?connectionName==`gcp-direct-connect`].connectionId' \
    --output text)

# Create Direct Connect Gateway
aws directconnect create-direct-connect-gateway \
    --direct-connect-gateway-name "gcp-dc-gateway" \
    --amazon-side-asn ${AWS_ASN}

# Get Gateway ID
DC_GATEWAY_ID=$(aws directconnect describe-direct-connect-gateways \
    --query 'directConnectGateways[?directConnectGatewayName==`gcp-dc-gateway`].directConnectGatewayId' \
    --output text)
```

### 2. Create Virtual Interface

```bash
# Create private virtual interface
aws directconnect create-private-virtual-interface \
    --connection-id ${DC_CONNECTION_ID} \
    --new-private-virtual-interface \
    "virtualInterfaceName=gcp-vif,vlan=1234,asn=${AWS_ASN},authKey=YOUR_AUTH_KEY,amazonAddress=169.254.0.1/30,customerAddress=169.254.0.2/30,directConnectGatewayId=${DC_GATEWAY_ID}"

# Get Virtual Interface ID
VIF_ID=$(aws directconnect describe-virtual-interfaces \
    --connection-id ${DC_CONNECTION_ID} \
    --query 'virtualInterfaces[?virtualInterfaceName==`gcp-vif`].virtualInterfaceId' \
    --output text)
```

## AWS VPC Configuration

### 1. Create VPC and Subnets

```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block ${AWS_VPC_CIDR} \
    --instance-tenancy default \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=gcp-connected-vpc}]' \
    --query 'Vpc.VpcId' \
    --output text)

# Create subnets
SUBNET_1_ID=$(aws ec2 create-subnet \
    --vpc-id ${VPC_ID} \
    --cidr-block "172.16.1.0/24" \
    --availability-zone "${AWS_REGION}a" \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=gcp-subnet-1}]' \
    --query 'Subnet.SubnetId' \
    --output text)

SUBNET_2_ID=$(aws ec2 create-subnet \
    --vpc-id ${VPC_ID} \
    --cidr-block "172.16.2.0/24" \
    --availability-zone "${AWS_REGION}b" \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=gcp-subnet-2}]' \
    --query 'Subnet.SubnetId' \
    --output text)
```

### 2. Configure VPC Gateway

```bash
# Create VPN Gateway
VGW_ID=$(aws ec2 create-vpn-gateway \
    --type ipsec.1 \
    --amazon-side-asn ${AWS_ASN} \
    --tag-specifications 'ResourceType=vpn-gateway,Tags=[{Key=Name,Value=gcp-vpn-gateway}]' \
    --query 'VpnGateway.VpnGatewayId' \
    --output text)

# Attach VPN Gateway to VPC
aws ec2 attach-vpn-gateway \
    --vpn-gateway-id ${VGW_ID} \
    --vpc-id ${VPC_ID}

# Create Direct Connect Gateway association
aws directconnect create-direct-connect-gateway-association \
    --direct-connect-gateway-id ${DC_GATEWAY_ID} \
    --gateway-id ${VGW_ID} \
    --allowed-prefixes ${AWS_VPC_CIDR}
```

## Google Cloud Configuration

### 1. Create VLAN Attachment

```bash
# Create Partner Interconnect VLAN attachment
gcloud compute interconnects attachments partner create gcp-aws-attachment \
    --project=${GCP_PROJECT_ID} \
    --region=${GCP_REGION} \
    --router=core-router \
    --edge-availability-domain=availability-domain-1 \
    --bandwidth=10G

# Get pairing key
PAIRING_KEY=$(gcloud compute interconnects attachments describe gcp-aws-attachment \
    --project=${GCP_PROJECT_ID} \
    --region=${GCP_REGION} \
    --format="get(pairingKey)")
```

### 2. Configure Cloud Router

```bash
# Update Cloud Router for AWS connection
gcloud compute routers update core-router \
    --project=${GCP_PROJECT_ID} \
    --region=${GCP_REGION} \
    --advertisement-mode=custom \
    --advertised-ranges=${GCP_VPC_CIDR} \
    --asn=${GCP_ASN}
```

## BGP Configuration

### 1. Configure AWS BGP

```bash
# Create BGP peer on Direct Connect Gateway
aws directconnect create-bgp-peer \
    --virtual-interface-id ${VIF_ID} \
    --asn ${AWS_ASN} \
    --auth-key "YOUR_AUTH_KEY" \
    --amazon-address "169.254.0.1/30" \
    --customer-address "169.254.0.2/30"
```

### 2. Configure Google Cloud BGP

```bash
# Add BGP peer to Cloud Router
gcloud compute routers add-bgp-peer core-router \
    --project=${GCP_PROJECT_ID} \
    --peer-name=aws-peer \
    --region=${GCP_REGION} \
    --peer-asn=${AWS_ASN} \
    --interface=gcp-aws-attachment \
    --peer-ip-address=169.254.0.2
```

## Security Policies

### 1. AWS Security Groups

```bash
# Create security group
SG_ID=$(aws ec2 create-security-group \
    --group-name "gcp-security-group" \
    --description "Security group for GCP connectivity" \
    --vpc-id ${VPC_ID} \
    --query 'GroupId' \
    --output text)

# Configure security group rules
aws ec2 authorize-security-group-ingress \
    --group-id ${SG_ID} \
    --protocol all \
    --source-prefix-list-id ${GCP_VPC_CIDR}

aws ec2 authorize-security-group-egress \
    --group-id ${SG_ID} \
    --protocol all \
    --destination-prefix-list-id ${GCP_VPC_CIDR}
```

### 2. Google Cloud Firewall Rules

```bash
# Create firewall rules for AWS traffic
gcloud compute firewall-rules create allow-aws-ingress \
    --project=${GCP_PROJECT_ID} \
    --network=core-network \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges=${AWS_VPC_CIDR} \
    --action=ALLOW \
    --rules=all

# Create egress rules
gcloud compute firewall-rules create allow-aws-egress \
    --project=${GCP_PROJECT_ID} \
    --network=core-network \
    --direction=EGRESS \
    --priority=1000 \
    --destination-ranges=${AWS_VPC_CIDR} \
    --action=ALLOW \
    --rules=all
```

## Monitoring and Operations

### 1. AWS CloudWatch Monitoring

```bash
# Create CloudWatch metrics for Direct Connect
aws cloudwatch put-metric-alarm \
    --alarm-name "DirectConnectBGPStatus" \
    --alarm-description "Monitor BGP session status" \
    --metric-name "BGPStatus" \
    --namespace "AWS/DirectConnect" \
    --dimensions Name=VirtualInterfaceId,Value=${VIF_ID} \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 0 \
    --comparison-operator LessThanThreshold \
    --statistic Average \
    --alarm-actions ${AWS_SNS_TOPIC_ARN}
```

### 2. Google Cloud Monitoring

```bash
# Create uptime check for interconnect
gcloud monitoring uptime-checks create tcp \
    --project=${GCP_PROJECT_ID} \
    --display-name="AWS Interconnect Health Check" \
    --resource-type=uptime-url \
    --tcp-port=179 \
    --monitored-resource=interconnect_attachment \
    --resource-labels="attachment_name=gcp-aws-attachment"

# Create alert policy
gcloud monitoring policies create \
    --project=${GCP_PROJECT_ID} \
    --condition-filter="metric.type=\"compute.googleapis.com/interconnect/attachment/status\" resource.type=\"interconnect_attachment\"" \
    --condition-threshold-value=0 \
    --condition-threshold-comparison=COMPARISON_LT \
    --duration=300s \
    --display-name="AWS Interconnect Down Alert"
```

### 3. Route Verification

```bash
# Verify AWS routes
aws ec2 describe-route-tables \
    --filters Name=vpc-id,Values=${VPC_ID}

# Verify Google Cloud routes
gcloud compute routes list \
    --project=${GCP_PROJECT_ID} \
    --filter="network=core-network"

# Check BGP session status
gcloud compute routers get-status core-router \
    --project=${GCP_PROJECT_ID} \
    --region=${GCP_REGION}
```

Remember to:
1. Replace all placeholder values with your actual configuration
2. Store authentication keys securely
3. Document all IP ranges and ASNs
4. Test failover scenarios regularly
5. Monitor BGP session health
6. Keep security groups and firewall rules updated
7. Regularly review and update route advertisements
8. Monitor Direct Connect and Interconnect bandwidth usage
9. Set up alerts for critical metrics
10. Maintain documentation of the network topology
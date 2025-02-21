# Google Cloud Core Network Infrastructure Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Network Planning](#network-planning)
3. [Core Network Implementation](#core-network-implementation)
4. [Cloud Router Configuration](#cloud-router-configuration)
5. [Security Policies](#security-policies)
6. [Testing and Verification](#testing-and-verification)

## Prerequisites

### Required Permissions
```bash
# Required IAM roles
- roles/compute.networkAdmin
- roles/compute.securityAdmin
- roles/compute.admin
```

### Tools Installation
```bash
# Install the latest Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init
```

## Network Planning

### CIDR Allocation
```bash
# Example CIDR blocks - adjust according to your needs
PRIMARY_CIDR="10.0.0.0/16"          # Main VPC CIDR
SECONDARY_POD_CIDR="172.16.0.0/16"  # For GKE pods
SECONDARY_SVC_CIDR="172.17.0.0/16"  # For GKE services
```

### Regional Planning
```bash
# Define primary and secondary regions
PRIMARY_REGION="us-central1"
SECONDARY_REGION="us-east1"
PROJECT_ID="your-project-id"
```

## Core Network Implementation

### 1. Create the Core VPC Network

```bash
# Enable required APIs
gcloud services enable \
    compute.googleapis.com \
    servicenetworking.googleapis.com

# Create the VPC with custom subnet mode
gcloud compute networks create core-network \
    --project=${PROJECT_ID} \
    --subnet-mode=custom \
    --bgp-routing-mode=global \
    --mtu=1460 \
    --description="Core network for multi-cloud connectivity"
```

### 2. Create Regional Subnets

```bash
# Create primary region subnet
gcloud compute networks subnets create core-subnet-primary \
    --project=${PROJECT_ID} \
    --network=core-network \
    --region=${PRIMARY_REGION} \
    --range=${PRIMARY_CIDR} \
    --enable-private-ip-google-access \
    --enable-flow-logs \
    --logging-aggregation-interval=interval-5-sec \
    --logging-flow-sampling=0.5 \
    --logging-metadata=include-all

# Create secondary region subnet
gcloud compute networks subnets create core-subnet-secondary \
    --project=${PROJECT_ID} \
    --network=core-network \
    --region=${SECONDARY_REGION} \
    --range="10.1.0.0/16" \
    --enable-private-ip-google-access \
    --enable-flow-logs
```

### 3. Configure Secondary IP Ranges (for GKE)

```bash
# Add secondary ranges for GKE
gcloud compute networks subnets update core-subnet-primary \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION} \
    --add-secondary-ranges \
    pods=${SECONDARY_POD_CIDR},services=${SECONDARY_SVC_CIDR}
```

## Cloud Router Configuration

### 1. Create Cloud Router

```bash
# Create the primary Cloud Router
gcloud compute routers create core-router \
    --project=${PROJECT_ID} \
    --network=core-network \
    --region=${PRIMARY_REGION} \
    --asn=65001 \
    --description="Core router for multi-cloud connectivity" \
    --advertisement-mode=custom

# Create backup router
gcloud compute routers create core-router-backup \
    --project=${PROJECT_ID} \
    --network=core-network \
    --region=${SECONDARY_REGION} \
    --asn=65001 \
    --description="Backup core router"
```

### 2. Configure Route Advertisements

```bash
# Configure route advertisements for primary router
gcloud compute routers update core-router \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION} \
    --advertisement-mode=custom \
    --advertised-ranges=${PRIMARY_CIDR},${SECONDARY_POD_CIDR},${SECONDARY_SVC_CIDR} \
    --set-advertisement-ranges

# Configure BGP timers
gcloud compute routers update core-router \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION} \
    --keepalive-interval=20 \
    --hold-time=60
```

## Security Policies

### 1. Create Firewall Rules

```bash
# Create base firewall rules
gcloud compute firewall-rules create allow-internal \
    --project=${PROJECT_ID} \
    --network=core-network \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges=${PRIMARY_CIDR} \
    --action=ALLOW \
    --rules=tcp,udp,icmp \
    --description="Allow internal network communication"

# Create SSH access rule
gcloud compute firewall-rules create allow-ssh \
    --project=${PROJECT_ID} \
    --network=core-network \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges="35.235.240.0/20" \
    --target-tags=allow-ssh \
    --action=ALLOW \
    --rules=tcp:22 \
    --description="Allow SSH from IAP"

# Create health check rule
gcloud compute firewall-rules create allow-health-checks \
    --project=${PROJECT_ID} \
    --network=core-network \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges="35.191.0.0/16,130.211.0.0/22" \
    --target-tags=allow-health-checks \
    --action=ALLOW \
    --rules=tcp
```

### 2. Configure Network Policies

```bash
# Enable VPC Flow Logs
gcloud compute networks subnets update core-subnet-primary \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION} \
    --enable-flow-logs \
    --logging-aggregation-interval=interval-5-sec \
    --logging-flow-sampling=0.5 \
    --logging-metadata=include-all

# Create organization security policies
gcloud compute security-policies create core-security-policy \
    --project=${PROJECT_ID} \
    --description="Core network security policy"

# Add WAF rules
gcloud compute security-policies rules create 1000 \
    --project=${PROJECT_ID} \
    --security-policy=core-security-policy \
    --description="Block known bad IPs" \
    --src-ip-ranges="10.0.0.0/8" \
    --action="allow"
```

### 3. Configure Private Google Access

```bash
# Create private service connection
gcloud compute addresses create google-managed-services-range \
    --project=${PROJECT_ID} \
    --global \
    --purpose=VPC_PEERING \
    --prefix-length=16 \
    --network=core-network

# Configure private service access
gcloud services vpc-peerings connect \
    --project=${PROJECT_ID} \
    --network=core-network \
    --ranges=google-managed-services-range
```

## Testing and Verification

### 1. Verify Network Configuration

```bash
# Verify VPC creation
gcloud compute networks describe core-network \
    --project=${PROJECT_ID}

# List subnets
gcloud compute networks subnets list \
    --project=${PROJECT_ID} \
    --network=core-network

# Verify Cloud Router status
gcloud compute routers get-status core-router \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION}
```

### 2. Test Connectivity

```bash
# Create test instances
gcloud compute instances create test-vm-1 \
    --project=${PROJECT_ID} \
    --zone=${PRIMARY_REGION}-a \
    --subnet=core-subnet-primary \
    --tags=allow-ssh

# Test internal connectivity
gcloud compute ssh test-vm-1 --zone=${PRIMARY_REGION}-a -- 'ping -c 3 google.com'
```

### 3. Verify Security Policies

```bash
# List firewall rules
gcloud compute firewall-rules list \
    --project=${PROJECT_ID} \
    --filter="network=core-network"

# View flow logs
gcloud logging read "resource.type=gce_subnetwork AND resource.labels.subnetwork_name=core-subnet-primary" \
    --project=${PROJECT_ID} \
    --limit=10
```

## Monitoring Setup

```bash
# Create uptime check
gcloud monitoring uptime-checks create tcp \
    --project=${PROJECT_ID} \
    --display-name="Core Router Health Check" \
    --resource-type=uptime-url \
    --tcp-port=443 \
    --monitoring-regions=us-central1,us-east1

# Create alerts
gcloud alpha monitoring policies create \
    --project=${PROJECT_ID} \
    --condition-display-name="High Latency Alert" \
    --condition-filter="metric.type=\"compute.googleapis.com/instance/network/received_bytes_count\" resource.type=\"gce_instance\"" \
    --duration="300s" \
    --aggregation-alignment-period="300s" \
    --aggregation-per-series-aligner=ALIGN_MEAN \
    --aggregation-cross-series-reducer=REDUCE_SUM \
    --condition-threshold-value=1000000 \
    --condition-threshold-comparison=COMPARISON_GT
```

Remember to replace `${PROJECT_ID}`, `${PRIMARY_REGION}`, `${SECONDARY_REGION}`, and CIDR ranges with your actual values before running these commands.
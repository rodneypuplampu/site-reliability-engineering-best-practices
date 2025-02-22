# Azure to Google Cloud Network Infrastructure Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Azure ExpressRoute Setup](#azure-expressroute-setup)
3. [Azure VNet Configuration](#azure-vnet-configuration)
4. [Google Cloud Configuration](#google-cloud-configuration)
5. [BGP Configuration](#bgp-configuration)
6. [Security Policies](#security-policies)
7. [Monitoring and Operations](#monitoring-and-operations)

## Prerequisites

### Environment Variables
```bash
# Azure Environment Variables
export AZURE_SUBSCRIPTION="your-subscription-id"
export AZURE_RESOURCE_GROUP="your-resource-group"
export AZURE_LOCATION="eastus"
export AZURE_VNET_CIDR="192.168.0.0/16"
export AZURE_ASN="65004"

# Google Cloud Environment Variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-east1"
export GCP_VPC_CIDR="10.0.0.0/16"
export GCP_ASN="65001"
```

### Azure Resource Provider Registration
```bash
# Register required resource providers
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.ExpressRoute
```

## Azure ExpressRoute Setup

### 1. Create ExpressRoute Circuit

```bash
# Create ExpressRoute circuit
az network express-route create \
    --name gcp-expressroute \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --location ${AZURE_LOCATION} \
    --bandwidth 10000 \
    --peering-location "Washington DC" \
    --provider "Equinix" \
    --sku-tier "Premium" \
    --sku-family "MeteredData" \
    --allow-global-reach true

# Get circuit ID
CIRCUIT_ID=$(az network express-route show \
    --name gcp-expressroute \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --query id -o tsv)
```

### 2. Configure ExpressRoute Peering

```bash
# Configure private peering
az network express-route peering create \
    --circuit-name gcp-expressroute \
    --peer-asn ${AZURE_ASN} \
    --primary-peer-subnet "169.254.0.0/30" \
    --secondary-peer-subnet "169.254.0.4/30" \
    --vlan-id 100 \
    --peering-type AzurePrivatePeering \
    --resource-group ${AZURE_RESOURCE_GROUP}
```

## Azure VNet Configuration

### 1. Create Virtual Network

```bash
# Create VNet
az network vnet create \
    --name gcp-vnet \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --location ${AZURE_LOCATION} \
    --address-prefixes ${AZURE_VNET_CIDR} \
    --subnet-name primary-subnet \
    --subnet-prefixes "192.168.1.0/24"

# Create additional subnet
az network vnet subnet create \
    --name secondary-subnet \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --vnet-name gcp-vnet \
    --address-prefix "192.168.2.0/24"

# Create Gateway Subnet
az network vnet subnet create \
    --name GatewaySubnet \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --vnet-name gcp-vnet \
    --address-prefix "192.168.3.0/24"
```

### 2. Create Virtual Network Gateway

```bash
# Create public IP for gateway
az network public-ip create \
    --name gcp-gateway-ip \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --allocation-method Dynamic

# Create virtual network gateway
az network vnet-gateway create \
    --name gcp-gateway \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --location ${AZURE_LOCATION} \
    --vnet gcp-vnet \
    --gateway-type ExpressRoute \
    --sku Standard \
    --asn ${AZURE_ASN} \
    --public-ip-address gcp-gateway-ip
```

### 3. Connect Gateway to ExpressRoute

```bash
# Connect virtual network gateway to ExpressRoute circuit
az network vnet-gateway connection create \
    --name gcp-connection \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --vnet-gateway gcp-gateway \
    --express-route-circuit ${CIRCUIT_ID} \
    --routing-weight 10
```

## Google Cloud Configuration

### 1. Create VLAN Attachment

```bash
# Create Partner Interconnect VLAN attachment
gcloud compute interconnects attachments partner create azure-attachment \
    --project=${GCP_PROJECT_ID} \
    --region=${GCP_REGION} \
    --router=core-router \
    --edge-availability-domain=availability-domain-1 \
    --bandwidth=10G

# Get pairing key
PAIRING_KEY=$(gcloud compute interconnects attachments describe azure-attachment \
    --project=${GCP_PROJECT_ID} \
    --region=${GCP_REGION} \
    --format="get(pairingKey)")
```

### 2. Configure Cloud Router

```bash
# Update Cloud Router for Azure connection
gcloud compute routers update core-router \
    --project=${GCP_PROJECT_ID} \
    --region=${GCP_REGION} \
    --advertisement-mode=custom \
    --advertised-ranges=${GCP_VPC_CIDR} \
    --asn=${GCP_ASN}
```

## BGP Configuration

### 1. Configure Azure BGP

```bash
# Configure BGP settings for ExpressRoute
az network express-route update \
    --name gcp-expressroute \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --route-filter-in "Allow" \
    --route-filter-out "Allow"

# Configure route filters
az network route-filter create \
    --name gcp-route-filter \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --location ${AZURE_LOCATION}

az network route-filter rule create \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --route-filter-name gcp-route-filter \
    --name allow-gcp-routes \
    --access Allow \
    --communities "12076:5040" \
    --rule-type Community
```

### 2. Configure Google Cloud BGP

```bash
# Add BGP peer to Cloud Router
gcloud compute routers add-bgp-peer core-router \
    --project=${GCP_PROJECT_ID} \
    --peer-name=azure-peer \
    --region=${GCP_REGION} \
    --peer-asn=${AZURE_ASN} \
    --interface=azure-attachment \
    --peer-ip-address=169.254.0.2
```

## Security Policies

### 1. Azure Network Security Groups

```bash
# Create NSG
az network nsg create \
    --name gcp-nsg \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --location ${AZURE_LOCATION}

# Configure NSG rules
az network nsg rule create \
    --name AllowGCPInbound \
    --nsg-name gcp-nsg \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --priority 100 \
    --source-address-prefixes ${GCP_VPC_CIDR} \
    --destination-address-prefixes '*' \
    --access Allow \
    --protocol '*' \
    --direction Inbound

# Associate NSG with subnet
az network vnet subnet update \
    --name primary-subnet \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --vnet-name gcp-vnet \
    --network-security-group gcp-nsg
```

### 2. Azure Network Policy

```bash
# Create network policy
az network vnet subnet update \
    --name primary-subnet \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --vnet-name gcp-vnet \
    --disable-private-endpoint-network-policies true

# Configure service endpoints
az network vnet subnet update \
    --name primary-subnet \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --vnet-name gcp-vnet \
    --service-endpoints Microsoft.Storage Microsoft.Sql
```

### 3. Google Cloud Firewall Rules

```bash
# Create firewall rules for Azure traffic
gcloud compute firewall-rules create allow-azure-ingress \
    --project=${GCP_PROJECT_ID} \
    --network=core-network \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges=${AZURE_VNET_CIDR} \
    --action=ALLOW \
    --rules=all

# Create egress rules
gcloud compute firewall-rules create allow-azure-egress \
    --project=${GCP_PROJECT_ID} \
    --network=core-network \
    --direction=EGRESS \
    --priority=1000 \
    --destination-ranges=${AZURE_VNET_CIDR} \
    --action=ALLOW \
    --rules=all
```

## Monitoring and Operations

### 1. Azure Monitoring

```bash
# Create monitor alert
az monitor metrics alert create \
    --name "ExpressRouteStatus" \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --scopes ${CIRCUIT_ID} \
    --condition "avg BitsInPerSecond >= 8000000000" \
    --window-size 5m \
    --evaluation-frequency 1m

# Enable diagnostic settings
az monitor diagnostic-settings create \
    --name "expressroute-diagnostics" \
    --resource ${CIRCUIT_ID} \
    --logs '[{"category": "PeeringRouteLog","enabled": true}]' \
    --metrics '[{"category": "AllMetrics","enabled": true}]' \
    --workspace "your-log-analytics-workspace"
```

### 2. Google Cloud Monitoring

```bash
# Create uptime check for interconnect
gcloud monitoring uptime-checks create tcp \
    --project=${GCP_PROJECT_ID} \
    --display-name="Azure Interconnect Health Check" \
    --resource-type=uptime-url \
    --tcp-port=179 \
    --monitored-resource=interconnect_attachment \
    --resource-labels="attachment_name=azure-attachment"

# Create alert policy
gcloud monitoring policies create \
    --project=${GCP_PROJECT_ID} \
    --condition-filter="metric.type=\"compute.googleapis.com/interconnect/attachment/status\" resource.type=\"interconnect_attachment\"" \
    --condition-threshold-value=0 \
    --condition-threshold-comparison=COMPARISON_LT \
    --duration=300s \
    --display-name="Azure Interconnect Down Alert"
```

### 3. Route Verification

```bash
# Verify Azure routes
az network vnet show \
    --resource-group ${AZURE_RESOURCE_GROUP} \
    --name gcp-vnet \
    --query "addressSpace.addressPrefixes"

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
2. Store sensitive information securely
3. Document all IP ranges and ASNs
4. Test failover scenarios regularly
5. Monitor BGP session health
6. Keep security groups and firewall rules updated
7. Regularly review and update route advertisements
8. Monitor ExpressRoute and Interconnect bandwidth usage
9. Set up alerts for critical metrics
10. Maintain documentation of the network topology
11. Configure backup connectivity if needed
12. Regular testing of DR scenarios
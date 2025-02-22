# On-Premises to Google Cloud Network Infrastructure Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [VPN Connection Setup](#vpn-connection-setup)
3. [Dedicated Interconnect Setup](#dedicated-interconnect-setup)
4. [BGP Configuration](#bgp-configuration)
5. [Security Policies](#security-policies)
6. [Monitoring and Operations](#monitoring-and-operations)

## Prerequisites

### On-Premises Requirements
```bash
# Required on-premises equipment
- BGP-capable router (Cisco/Juniper/etc.)
- Public IP address for VPN endpoint
- ASN assignment (65002 in this example)
- Minimum 1Gbps connection for Interconnect

# Required IP ranges
ONPREM_CIDR="192.168.0.0/16"
GCP_CIDR="10.0.0.0/16"
ONPREM_PUBLIC_IP="203.0.113.1"  # Example public IP
```

### Environment Variables
```bash
# Set environment variables
PROJECT_ID="your-project-id"
REGION="us-central1"
ROUTER_NAME="core-router"
VPN_GATEWAY_NAME="onprem-gateway"
SHARED_SECRET=$(openssl rand -base64 32)  # Generate strong secret
```

## VPN Connection Setup

### 1. Create HA VPN Gateway

```bash
# Create the HA VPN gateway
gcloud compute vpn-gateways create ${VPN_GATEWAY_NAME} \
    --project=${PROJECT_ID} \
    --network=core-network \
    --region=${REGION} \
    --description="HA VPN Gateway for on-premises connectivity"

# Get the created VPN gateway IPs
VPN_GATEWAY_IPS=$(gcloud compute vpn-gateways describe ${VPN_GATEWAY_NAME} \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --format="get(vpnInterfaces[].ipAddress)")
```

### 2. Configure External VPN Gateway

```bash
# Create external VPN gateway representation
gcloud compute external-vpn-gateways create onprem-external-gateway \
    --project=${PROJECT_ID} \
    --interfaces=0=${ONPREM_PUBLIC_IP} \
    --redundancy-type=SINGLE_IP_INTERNALLY_REDUNDANT

# Create VPN tunnels (primary and backup)
gcloud compute vpn-tunnels create onprem-tunnel1 \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --vpn-gateway=${VPN_GATEWAY_NAME} \
    --peer-external-gateway=onprem-external-gateway \
    --peer-external-gateway-interface=0 \
    --interface=0 \
    --ike-version=2 \
    --shared-secret=${SHARED_SECRET} \
    --router=${ROUTER_NAME} \
    --description="Primary VPN tunnel to on-premises"

gcloud compute vpn-tunnels create onprem-tunnel2 \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --vpn-gateway=${VPN_GATEWAY_NAME} \
    --peer-external-gateway=onprem-external-gateway \
    --peer-external-gateway-interface=0 \
    --interface=1 \
    --ike-version=2 \
    --shared-secret=${SHARED_SECRET} \
    --router=${ROUTER_NAME} \
    --description="Backup VPN tunnel to on-premises"
```

### 3. Configure On-Premises Router (Cisco IOS Example)

```cisco
! Configure IKEv2 proposal
crypto ikev2 proposal GCP-PROPOSAL
 encryption aes-256-gcm
 integrity sha512
 group 20
 
! Configure IKEv2 policy
crypto ikev2 policy GCP-POLICY
 proposal GCP-PROPOSAL

! Configure IKEv2 keyring
crypto ikev2 keyring GCP-KEYRING
 peer GCP-PEER
  address <VPN_GATEWAY_IP_1>
  pre-shared-key ${SHARED_SECRET}
  
! Configure IPsec transform set
crypto ipsec transform-set GCP-TRANSFORM esp-gcm 256
 mode tunnel

! Configure IPsec profile
crypto ipsec profile GCP-IPSEC-PROFILE
 set transform-set GCP-TRANSFORM
 set ikev2-profile GCP-PROFILE

! Configure tunnel interface
interface Tunnel1
 ip address 169.254.1.2 255.255.255.252
 tunnel source GigabitEthernet0/0
 tunnel destination <VPN_GATEWAY_IP_1>
 tunnel protection ipsec profile GCP-IPSEC-PROFILE
```

## Dedicated Interconnect Setup

### 1. Order Cross-Connect

```bash
# Generate Letter of Authorization (LOA)
gcloud compute interconnects attachments dedicated create onprem-interconnect \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --router=${ROUTER_NAME} \
    --bandwidth=10G \
    --description="Primary interconnect to on-premises"

# Get LOA information
gcloud compute interconnects attachments describe onprem-interconnect \
    --project=${PROJECT_ID} \
    --region=${REGION}
```

### 2. Create VLAN Attachment

```bash
# Create VLAN attachment
gcloud compute interconnects attachments dedicated create onprem-vlan \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --interconnect=onprem-interconnect \
    --router=${ROUTER_NAME} \
    --bandwidth=10G \
    --vlan=1234
```

## BGP Configuration

### 1. Configure Cloud Router BGP

```bash
# Configure BGP session for VPN
gcloud compute routers add-bgp-peer ${ROUTER_NAME} \
    --project=${PROJECT_ID} \
    --peer-name=onprem-peer-vpn \
    --region=${REGION} \
    --peer-asn=65002 \
    --interface=onprem-tunnel1 \
    --advertisement-mode=custom \
    --set-advertisement-ranges=${GCP_CIDR} \
    --peer-ip-address=169.254.1.2

# Configure BGP session for Interconnect
gcloud compute routers add-bgp-peer ${ROUTER_NAME} \
    --project=${PROJECT_ID} \
    --peer-name=onprem-peer-interconnect \
    --region=${REGION} \
    --peer-asn=65002 \
    --interface=onprem-vlan \
    --advertisement-mode=custom \
    --set-advertisement-ranges=${GCP_CIDR}
```

### 2. Configure Route Priorities

```bash
# Set route priorities
gcloud compute routers update-bgp-peer ${ROUTER_NAME} \
    --project=${PROJECT_ID} \
    --peer-name=onprem-peer-interconnect \
    --region=${REGION} \
    --advertisement-mode=custom \
    --set-advertisement-ranges=${GCP_CIDR} \
    --advertised-route-priority=100

gcloud compute routers update-bgp-peer ${ROUTER_NAME} \
    --project=${PROJECT_ID} \
    --peer-name=onprem-peer-vpn \
    --region=${REGION} \
    --advertisement-mode=custom \
    --set-advertisement-ranges=${GCP_CIDR} \
    --advertised-route-priority=200
```

## Security Policies

### 1. Configure Firewall Rules

```bash
# Create firewall rules for on-premises traffic
gcloud compute firewall-rules create allow-onprem-ingress \
    --project=${PROJECT_ID} \
    --network=core-network \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges=${ONPREM_CIDR} \
    --action=ALLOW \
    --rules=tcp,udp,icmp \
    --description="Allow traffic from on-premises network"

# Create egress rules
gcloud compute firewall-rules create allow-onprem-egress \
    --project=${PROJECT_ID} \
    --network=core-network \
    --direction=EGRESS \
    --priority=1000 \
    --destination-ranges=${ONPREM_CIDR} \
    --action=ALLOW \
    --rules=tcp,udp,icmp \
    --description="Allow traffic to on-premises network"
```

### 2. Configure Security Policies

```bash
# Create security policy for on-premises traffic
gcloud compute security-policies create onprem-security-policy \
    --project=${PROJECT_ID} \
    --description="Security policy for on-premises traffic"

# Add rules to security policy
gcloud compute security-policies rules create 1000 \
    --project=${PROJECT_ID} \
    --security-policy=onprem-security-policy \
    --description="Allow on-premises traffic" \
    --src-ip-ranges=${ONPREM_CIDR} \
    --action=allow
```

## Monitoring and Operations

### 1. Configure VPN Monitoring

```bash
# Create uptime check for VPN tunnels
gcloud monitoring uptime-checks create tcp \
    --project=${PROJECT_ID} \
    --display-name="VPN Tunnel Health Check" \
    --resource-type=uptime-url \
    --tcp-port=500 \
    --monitored-resource=vpn_gateway \
    --resource-labels="gateway_name=${VPN_GATEWAY_NAME}"

# Create alert policy
gcloud monitoring policies create \
    --project=${PROJECT_ID} \
    --condition-filter="metric.type=\"compute.googleapis.com/vpn/tunnel_established\" resource.type=\"vpn_gateway\"" \
    --condition-threshold-value=0 \
    --condition-threshold-comparison=COMPARISON_LT \
    --duration=300s \
    --display-name="VPN Tunnel Down Alert"
```

### 2. Configure BGP Monitoring

```bash
# Create BGP session monitoring
gcloud monitoring metrics-scopes create bgp-monitoring \
    --project=${PROJECT_ID} \
    --location=${REGION} \
    --monitored-projects=${PROJECT_ID}

# Create BGP alert policy
gcloud monitoring policies create \
    --project=${PROJECT_ID} \
    --condition-filter="metric.type=\"compute.googleapis.com/router/bgp/peer_status\" resource.type=\"router\"" \
    --condition-threshold-value=0 \
    --condition-threshold-comparison=COMPARISON_LT \
    --duration=300s \
    --display-name="BGP Session Down Alert"
```

### 3. Configure Logging

```bash
# Enable VPN tunnel logging
gcloud compute routers update ${ROUTER_NAME} \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --enable-logging

# Create log sink for VPN events
gcloud logging sinks create vpn-logs \
    --project=${PROJECT_ID} \
    --destination="storage.googleapis.com/${PROJECT_ID}-vpn-logs" \
    --log-filter="resource.type=\"vpn_gateway\""
```

Remember to:
1. Replace all placeholder values with your actual configuration
2. Store the shared secret securely
3. Document all IP ranges and ASNs
4. Test failover scenarios regularly
5. Monitor BGP session health
6. Keep firmware and security patches up to date on on-premises equipment
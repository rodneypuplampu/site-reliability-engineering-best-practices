# Core Network Infrastructure Security and Monitoring Guide

## Table of Contents
1. [Route Configuration](#route-configuration)
2. [Security Implementation](#security-implementation)
3. [Monitoring Infrastructure](#monitoring-infrastructure)
4. [Verification Procedures](#verification-procedures)
5. [Dashboard Setup](#dashboard-setup)

## Prerequisites

```bash
# Environment Variables
export PROJECT_ID="your-project-id"
export NETWORK_NAME="core-network"
export PRIMARY_REGION="us-central1"
export SECONDARY_REGION="us-east1"

# Core CIDRs
export GCP_CIDR="10.0.0.0/16"
export AWS_CIDR="172.16.0.0/16"
export AZURE_CIDR="192.168.0.0/16"
export ONPREM_CIDR="10.100.0.0/16"
```

## Route Configuration

### 1. Configure Route Advertisements

```bash
# Update Core Router Advertisement Settings
gcloud compute routers update core-router \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION} \
    --advertisement-mode=custom \
    --advertised-ranges=${GCP_CIDR} \
    --set-advertisement-ranges

# Configure Route Summarization
gcloud compute routers update core-router \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION} \
    --asn=65001 \
    --advertised-route-priority=100 \
    --ip-address-aggregates="10.0.0.0/8::/priority=90"
```

### 2. Define Route Policies

```bash
# Create Custom Routes
gcloud compute routes create backup-route \
    --project=${PROJECT_ID} \
    --network=${NETWORK_NAME} \
    --priority=1000 \
    --destination-range=${AWS_CIDR} \
    --next-hop-gateway=default-internet-gateway \
    --tags=backup

# Configure Route Failover
gcloud compute routers update-bgp-peer core-router \
    --project=${PROJECT_ID} \
    --peer-name=aws-peer \
    --region=${PRIMARY_REGION} \
    --advertised-route-priority=100 \
    --enable-route-failover
```

## Security Implementation

### 1. Google Cloud Armor Setup

```bash
# Create Cloud Armor Security Policy
gcloud compute security-policies create core-security-policy \
    --project=${PROJECT_ID} \
    --description="Core network security policy"

# Configure WAF Rules
gcloud compute security-policies rules create 1000 \
    --project=${PROJECT_ID} \
    --security-policy=core-security-policy \
    --description="Block known bad IPs" \
    --src-ip-ranges="10.0.0.0/8" \
    --action="allow"

# Configure DDoS Protection
gcloud compute security-policies update core-security-policy \
    --project=${PROJECT_ID} \
    --enable-layer7-ddos-defense
```

### 2. Core Firewall Configuration

```bash
# Create Base Firewall Rules
gcloud compute firewall-rules create allow-internal \
    --project=${PROJECT_ID} \
    --network=${NETWORK_NAME} \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges=${GCP_CIDR},${AWS_CIDR},${AZURE_CIDR},${ONPREM_CIDR} \
    --action=ALLOW \
    --rules=tcp,udp,icmp \
    --enable-logging

# Create Service-Specific Rules
gcloud compute firewall-rules create allow-monitoring \
    --project=${PROJECT_ID} \
    --network=${NETWORK_NAME} \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges="35.191.0.0/16,130.211.0.0/22" \
    --target-tags=allow-monitoring \
    --action=ALLOW \
    --rules=tcp:9090
```

### 3. Network Intelligence Configuration

```bash
# Enable Network Intelligence API
gcloud services enable networkintelligence.googleapis.com

# Configure Network Intelligence Center
gcloud network-intelligence centers create core-nic \
    --project=${PROJECT_ID} \
    --location=${PRIMARY_REGION}

# Enable Network Topology
gcloud network-intelligence topology enable \
    --project=${PROJECT_ID}
```

## Monitoring Infrastructure

### 1. Prometheus Setup

```bash
# Create GKE Cluster for Prometheus
gcloud container clusters create monitoring-cluster \
    --project=${PROJECT_ID} \
    --zone=${PRIMARY_REGION}-a \
    --network=${NETWORK_NAME} \
    --enable-ip-alias

# Install Prometheus using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --values prometheus-values.yaml
```

prometheus-values.yaml:
```yaml
prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          resources:
            requests:
              storage: 100Gi
  serviceMonitorSelector:
    matchLabels:
      monitoring: core-network

grafana:
  persistence:
    enabled: true
    size: 10Gi
  dashboards:
    default:
      network-overview:
        file: dashboards/network-overview.json
```

### 2. Cloud Monitoring Configuration

```bash
# Enable Cloud Monitoring API
gcloud services enable monitoring.googleapis.com

# Create Uptime Checks
gcloud monitoring uptime-checks create tcp \
    --project=${PROJECT_ID} \
    --display-name="BGP Health Check" \
    --resource-type=uptime-url \
    --tcp-port=179 \
    --monitored-resource=router

# Configure Custom Metrics
gcloud monitoring metrics-descriptors create \
    custom.googleapis.com/network/bgp_status \
    --project=${PROJECT_ID} \
    --metric-kind=gauge \
    --value-type=double \
    --description="BGP session status"
```

### 3. Alert Configuration

```bash
# Create Alert Policies
gcloud alpha monitoring policies create \
    --project=${PROJECT_ID} \
    --display-name="BGP Session Alert" \
    --condition-filter="metric.type=\"compute.googleapis.com/router/bgp/peer_status\"" \
    --condition-threshold-value=0 \
    --condition-threshold-comparison=COMPARISON_LT \
    --duration=300s \
    --notification-channels="projects/${PROJECT_ID}/notificationChannels/channel-id"

# Configure Bandwidth Alerts
gcloud alpha monitoring policies create \
    --project=${PROJECT_ID} \
    --display-name="High Bandwidth Usage" \
    --condition-filter="metric.type=\"compute.googleapis.com/router/network/bandwidth_usage\"" \
    --condition-threshold-value=0.8 \
    --condition-threshold-comparison=COMPARISON_GT \
    --duration=300s
```

## Verification Procedures

### 1. BGP Verification

```bash
# Check BGP Status
gcloud compute routers get-status core-router \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION} \
    --format="table(result.bgpPeerStatus[].name,result.bgpPeerStatus[].ipAddress,result.bgpPeerStatus[].status)"

# Verify Route Exchange
gcloud compute routers get-status core-router \
    --project=${PROJECT_ID} \
    --region=${PRIMARY_REGION} \
    --format="table(result.bestRoutes[].destRange,result.bestRoutes[].nextHopIp)"
```

### 2. Connectivity Testing

```bash
# Create Test Instances
for REGION in ${PRIMARY_REGION} ${SECONDARY_REGION}; do
    gcloud compute instances create test-vm-${REGION} \
        --project=${PROJECT_ID} \
        --zone=${REGION}-a \
        --network=${NETWORK_NAME} \
        --subnet=core-subnet \
        --tags=allow-monitoring
done

# Run Connectivity Tests
gcloud network-management connectivity-tests create cross-region-test \
    --project=${PROJECT_ID} \
    --source=projects/${PROJECT_ID}/zones/${PRIMARY_REGION}-a/instances/test-vm-${PRIMARY_REGION} \
    --destination=projects/${PROJECT_ID}/zones/${SECONDARY_REGION}-a/instances/test-vm-${SECONDARY_REGION} \
    --protocol=TCP
```

## Dashboard Setup

### 1. Network Intelligence Dashboard

```bash
# Create Network Dashboard
gcloud monitoring dashboards create \
    --project=${PROJECT_ID} \
    --config-from-file=dashboard-config.json
```

dashboard-config.json:
```json
{
  "displayName": "Core Network Overview",
  "gridLayout": {
    "widgets": [
      {
        "title": "BGP Status",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"compute.googleapis.com/router/bgp/peer_status\""
              }
            }
          }]
        }
      },
      {
        "title": "Bandwidth Usage",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"compute.googleapis.com/router/network/bandwidth_usage\""
              }
            }
          }]
        }
      }
    ]
  }
}
```

### 2. Prometheus Grafana Dashboards

Create the following Grafana dashboards:
1. Network Overview Dashboard
2. BGP Metrics Dashboard
3. Bandwidth Utilization Dashboard
4. Security Events Dashboard

Example Network Overview Dashboard JSON:
```json
{
  "annotations": {
    "list": []
  },
  "editable": true,
  "panels": [
    {
      "title": "BGP Session Status",
      "type": "graph",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "rate(network_bandwidth_bytes_total[5m])",
          "legendFormat": "{{interface}}"
        }
      ]
    },
    {
      "title": "Firewall Drops",
      "type": "graph",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "sum(rate(firewall_dropped_packets_total[5m])) by (rule)",
          "legendFormat": "{{rule}}"
        }
      ]
    }
  ]
}
```

### 3. Regular Verification Tasks

Create a verification schedule:

1. Hourly Checks:
   - BGP session status
   - Route stability
   - Basic connectivity

2. Daily Checks:
   - Bandwidth utilization
   - Firewall rule effectiveness
   - Security policy violations

3. Weekly Checks:
   - Full connectivity matrix testing
   - Route optimization review
   - Security policy review

4. Monthly Checks:
   - Failover testing
   - Performance baseline review
   - Security posture assessment

Remember to:
1. Maintain clear documentation of all monitoring configurations
2. Regularly review and update alert thresholds
3. Test notification channels periodically
4. Keep dashboards updated with new metrics
5. Verify backup monitoring systems
6. Conduct regular security assessments
7. Update runbooks based on incidents
8. Train team members on monitoring tools
9. Regular backup of monitoring configurations
10. Document all custom metrics and their significance
          "expr": "bgp_session_up",
          "legendFormat": "{{peer}}"
        }
      ]
    },
    {
      "title": "Network Bandwidth",
      "type": "graph",
      "datasource": "Prometheus",
      "targets": [
        {
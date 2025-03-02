# SBC Trunking with Traffic Distribution Groups (TDG)

## Overview

This document explains how to implement a robust, multi-region call routing architecture using Session Border Controllers (SBCs), AWS Traffic Distribution Groups (TDGs), and Google Cloud Router. This architecture provides enhanced reliability, intelligent load balancing, and seamless failover capabilities for Amazon Connect contact centers operating across multiple regions.

## Architecture Components

### Core Infrastructure
- **Session Border Controllers (SBCs)**: Acts as the entry point for all inbound voice traffic
- **Google Cloud Router**: Provides centralized routing management across cloud environments
- **AWS Traffic Distribution Groups**: Manages call distribution between Amazon Connect instances
- **Amazon Connect Instances**: Deployed across multiple AWS regions
- **Cross-Cloud Network Connectivity**: AWS Direct Connect and Google Cloud Interconnect

## Architecture Diagram

```
┌─────────────────────────────────────┐
│                                     │
│           PSTN / Carriers           │
│                                     │
└───────────────┬─────────────────────┘
                │
                │ SIP Trunks
                │
┌───────────────▼─────────────────────┐
│                                     │
│         Session Border              │
│        Controllers (SBCs)           │
│                                     │
└───────────────┬─────────────────────┘
                │
                │ SIP/RTP
                │
┌───────────────▼─────────────────────┐
│                                     │
│        Google Cloud Router          │
│                                     │
└┬─────────────┬─────────────┬────────┘
 │             │             │
 │             │             │
 │   Direct    │   Direct    │   Direct
 │  Connect    │  Connect    │  Connect
 │             │             │
 ▼             ▼             ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│          │ │          │ │          │
│   AWS    │ │   AWS    │ │   AWS    │
│ Region A │ │ Region B │ │ Region C │
│          │ │          │ │          │
└──┬───────┘ └──┬───────┘ └──┬───────┘
   │            │            │
   ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│          │ │          │ │          │
│ Traffic  │ │ Traffic  │ │ Traffic  │
│  Dist.   │ │  Dist.   │ │  Dist.   │
│  Group   │ │  Group   │ │  Group   │
│          │ │          │ │          │
└──┬───────┘ └──┬───────┘ └──┬───────┘
   │            │            │
   ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│          │ │          │ │          │
│ Amazon   │ │ Amazon   │ │ Amazon   │
│ Connect  │ │ Connect  │ │ Connect  │
│          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘
```

## Implementation Guide

### Step 1: SBC Configuration

#### Trunk Setup
1. Configure SIP trunks from your telecom carrier to terminate at your Session Border Controllers
2. Set up SBCs to handle SIP signaling and media (RTP) traffic for inbound calls
3. Configure SBCs for load balancing and high availability
4. Implement security policies including TLS for signaling and SRTP for media encryption

#### SBC Routing Intelligence
1. Configure SBCs to route calls to Google Cloud Router using SIP URIs
2. Implement failover logic at the SBC level
3. Set up health checks to monitor Google Cloud Router availability
4. Configure call quality metrics collection for ongoing optimization

### Step 2: Google Cloud Router Setup

#### Network Configuration
1. Configure Cloud Router in each Google Cloud region where interconnection is needed
2. Set up BGP sessions to advertise routes between Google Cloud and AWS
3. Configure Cloud Interconnect to connect with AWS Direct Connect
4. Implement redundant paths for high availability

#### Call Routing Logic
1. Configure Cloud Router to distribute traffic based on:
   - Geographic proximity for lowest latency
   - Current instance load
   - Instance health
   - Specific call attributes (ANI/DNIS patterns)
2. Implement call routing policies that align with business requirements
3. Set up routing metrics collection for analysis and optimization

### Step 3: AWS Traffic Distribution Groups

#### TDG Configuration
1. Create Traffic Distribution Groups in each AWS region
2. Configure distribution methods:
   - Percentage-based distribution (e.g., 50/50)
   - Weighted distribution based on capacity
   - Failover-only configurations
3. Link TDGs with Amazon Connect instances

#### Advanced TDG Settings
1. Configure health checks to monitor Amazon Connect instance health
2. Set up automatic failover triggers
3. Implement sticky session handling for consistent customer experience
4. Configure threshold-based distribution adjustments

### Step 4: Cross-Region Call Handling

#### Call Metadata Handling
1. Implement mechanisms to preserve call context across regions
2. Configure custom SIP headers to carry metadata between SBCs and Amazon Connect
3. Set up DynamoDB Global Tables for shared call data
4. Create Lambda functions to process call events and update shared state

#### Global Queue Management
1. Configure queue synchronization across regions
2. Implement agent availability sharing between instances
3. Set up cross-region transfers with context preservation
4. Create dashboards for global queue visibility

## Call Flow Examples

### Normal Operation (50/50 Distribution)

1. Call arrives at SBC from carrier
2. SBC routes call to Google Cloud Router
3. Cloud Router evaluates routing criteria and selects an AWS region
4. Traffic Distribution Group in the selected region receives the call
5. TDG routes the call to an Amazon Connect instance based on configured distribution
6. Call is processed by Amazon Connect and routed to an agent

### Failover Scenario

1. Call arrives at SBC from carrier
2. SBC attempts to route to primary Google Cloud Router path
3. If path is unavailable, SBC routes to backup path
4. Cloud Router detects an AWS region is unhealthy
5. Cloud Router automatically routes to a healthy region
6. Traffic Distribution Group in the healthy region receives the call
7. TDG routes to available Amazon Connect instance
8. Call is processed without customer impact

## Monitoring and Optimization

### Key Metrics to Monitor

1. **SBC Metrics**:
   - Trunk utilization
   - Call completion rates
   - SIP response codes
   - Media quality metrics (MOS, jitter, packet loss)

2. **Google Cloud Router Metrics**:
   - Route availability
   - Packet loss
   - Latency between regions
   - BGP session stability

3. **TDG Metrics**:
   - Distribution percentages
   - Failover frequency
   - Instance health status
   - Call routing decisions

4. **End-to-End Metrics**:
   - Call setup time
   - Post-dial delay
   - Transfer success rates
   - Customer experience scores

### Optimization Strategies

1. **Regular Route Analysis**:
   - Review BGP routing tables for optimization opportunities
   - Analyze traffic patterns to adjust distribution percentages
   - Test failover scenarios during maintenance windows

2. **Capacity Planning**:
   - Monitor trunk utilization trends
   - Adjust capacity based on traffic patterns
   - Plan for seasonal variations in call volume

3. **Health Check Tuning**:
   - Refine health check parameters for faster failover
   - Implement graduated health checks with multiple thresholds
   - Configure alerting for health status changes

## Troubleshooting Guide

### Common Issues and Resolutions

1. **Asymmetric Routing**:
   - Symptom: One-way audio or call setup failures
   - Resolution: Ensure consistent routing paths in both directions, verify BGP configurations

2. **SBC Call Routing Failures**:
   - Symptom: Calls fail to reach Google Cloud Router
   - Resolution: Check SBC configurations, verify network connectivity, examine SIP logs

3. **TDG Distribution Imbalance**:
   - Symptom: Uneven call distribution despite 50/50 configuration
   - Resolution: Verify health check configurations, examine routing decisions, check for sticky session settings

4. **Cross-Region Transfer Failures**:
   - Symptom: Calls drop during transfers between regions
   - Resolution: Verify SIP signaling path, check call metadata preservation, examine network latency

## Security Considerations

1. **Encryption**:
   - Implement TLS for SIP signaling
   - Configure SRTP for media encryption
   - Secure API communications with TLS/HTTPS

2. **Network Security**:
   - Implement strict firewall rules
   - Configure network ACLs to restrict traffic
   - Monitor for unusual traffic patterns

3. **Authentication**:
   - Implement certificate-based authentication for SBCs
   - Configure strong authentication for management interfaces
   - Implement audit logging for all configuration changes

## Advanced Configurations

### Custom SIP Header Routing

Configure SBCs to include custom SIP headers that can be used by Google Cloud Router and AWS TDGs for intelligent routing decisions:

```
INVITE sip:+13125551212@connect.example.com SIP/2.0
From: "Caller" <sip:+14155551212@carrier.example.com>
To: <sip:+13125551212@connect.example.com>
X-Priority: high
X-CustomerSegment: premium
X-PreferredRegion: us-east-1
X-RoutingIntent: agent-group-finance
```

### Weighted Distribution Examples

Configure TDGs with weighted distribution for special scenarios:

| Scenario | Region A | Region B | Region C |
|----------|----------|----------|----------|
| Normal | 33% | 33% | 34% |
| Region A Maintenance | 0% | 50% | 50% |
| High Volume | 40% | 40% | 20% |
| Disaster Recovery | 0% | 0% | 100% |

## Amazon Connect SIP Connector Integration

### Overview of SIP Connector

Amazon Connect SIP Connector enables you to integrate your existing telephony infrastructure with Amazon Connect, allowing you to:
- Connect your existing SIP trunks to Amazon Connect
- Use your customer-owned phone numbers without porting them to AWS
- Maintain relationships with your preferred carriers
- Distribute calls across multiple Amazon Connect instances

### Phone Number and IP Gateway Mapping

A critical aspect of this architecture is the mapping between inbound phone numbers, IP gateways, and Amazon Connect instances to facilitate effective load balancing:

#### Number Mapping Configuration

1. **DID to Instance Mapping:**
   - Configure mapping rules that associate DIDs (Direct Inward Dial numbers) with specific Amazon Connect instances
   - Store mapping data in a centralized database (e.g., DynamoDB Global Tables) accessible across regions
   - Example mapping table:

   | Phone Number | Primary Instance | Secondary Instance | Region Priority |
   |--------------|------------------|-------------------|-----------------|
   | +1-800-555-0100 | connect-instance-us-east-1 | connect-instance-us-west-2 | East, West, Central |
   | +1-800-555-0200 | connect-instance-us-west-2 | connect-instance-us-east-1 | West, East, Central |
   | +1-888-555-0300 | connect-instance-us-east-1 | connect-instance-us-west-2 | Round-robin |

2. **IP Gateway Mapping:**
   - Each SBC is configured with multiple IP gateways, each pointing to a specific AWS region via Google Cloud Router
   - Gateway IPs are mapped to phone numbers and instances for intelligent routing
   - Example IP gateway configuration:

   | Gateway Name | IP Address | Primary Region | Instance |
   |--------------|------------|----------------|----------|
   | gateway-east | 10.0.1.100 | us-east-1 | connect-instance-us-east-1 |
   | gateway-west | 10.0.2.100 | us-west-2 | connect-instance-us-west-2 |
   | gateway-central | 10.0.3.100 | us-central-1 | connect-instance-us-central-1 |

### Implementing Number-to-IP Gateway Routing

1. **SBC Routing Logic:**
   ```
   If (inbound_DID == +1-800-555-0100) {
       Try gateway-east;
       If (gateway-east.status != available) {
           Try gateway-west;
           If (gateway-west.status != available) {
               Try gateway-central;
           }
       }
   }
   ```

2. **Dynamic IP Selection:**
   - SBCs query a central routing service that considers:
     - Current instance health
     - Traffic distribution targets (e.g., 50/50 split)
     - Call attributes (ANI/DNIS)
     - Time of day/day of week patterns
   - The routing service returns the optimal gateway IP

3. **SIP URI Construction:**
   - SBCs construct the SIP URI using the selected gateway:
   ```
   INVITE sip:+18005550100@gateway-east.example.com;x-connect-instance=connect-instance-us-east-1 SIP/2.0
   ```

### Amazon Connect SIP Connector Configuration

The SIP Connector is configured to work with the SBC and Gateway architecture:

1. **Inbound Rules Configuration:**
   - Create inbound rules in Amazon Connect SIP Connector for each customer-owned phone number
   - Configure the rules to route calls to the appropriate Amazon Connect instance
   - Example rule:
   ```json
   {
     "Rule": "InboundRule1",
     "PhoneNumber": "+18005550100",
     "DestinationType": "ConnectInstance",
     "DestinationValue": "connect-instance-us-east-1",
     "Failover": {
       "DestinationType": "ConnectInstance",
       "DestinationValue": "connect-instance-us-west-2"
     }
   }
   ```

2. **Carrier SIP Trunk Configuration:**
   - Configure SIP trunks between carriers and SBCs
   - Set up authentication and encryption
   - Configure codec and quality parameters
   - Example SIP trunk parameter configuration:
   ```
   Trunk Name: Carrier-Trunk-1
   Signaling Endpoint: sbc.example.com:5060
   Media Endpoints: mediaserver1.example.com, mediaserver2.example.com
   Authentication Type: IP + Password
   Codecs: G.711a, G.711u, Opus
   DTMF Mode: RFC2833
   ```

3. **Contact Flow Integration:**
   - Create contact flows in Amazon Connect to handle calls from customer-owned phone numbers
   - Use attributes to identify the originating carrier and trunk
   - Implement special handling based on SIP headers passed from SBCs

### Load Balancing Implementation

1. **Layer 4 Load Balancing:**
   - Google Cloud Router implements Layer 4 (transport) load balancing
   - Routes SIP traffic based on IP and port to the appropriate AWS region
   - Monitors endpoint health and removes unhealthy endpoints

2. **Layer 7 Load Balancing:**
   - SBCs implement Layer 7 (application) load balancing
   - Examine SIP headers to make routing decisions
   - Apply business rules based on call attributes

3. **TDG Load Balancing:**
   - Traffic Distribution Groups perform the final level of load balancing
   - Distribute calls among Amazon Connect instances based on configured percentages
   - Example TDG configuration:
   ```json
   {
     "Name": "ConnectTDG-US",
     "DistributionMethod": "PERCENTAGE",
     "Distributions": [
       {
         "Region": "us-east-1",
         "Percentage": 50,
         "InstanceId": "connect-instance-us-east-1"
       },
       {
         "Region": "us-west-2",
         "Percentage": 50,
         "InstanceId": "connect-instance-us-west-2"
       }
     ],
     "FailoverConfigs": [
       {
         "FailoverRegion": "us-central-1",
         "InstanceId": "connect-instance-us-central-1"
       }
     ]
   }
   ```

### Important Considerations

1. **Number Portability:**
   - You can retain your existing phone numbers, avoiding the need to port them to AWS
   - Establish clear routing rules for each phone number

2. **Carrier Flexibility:**
   - Continue to use your preferred telecommunications carriers
   - Set up appropriate SIP trunk configurations with each carrier

3. **Network Requirements:**
   - Ensure reliable network connectivity with appropriate bandwidth
   - Implement redundant paths for high availability
   - Monitor network quality metrics (jitter, packet loss, latency)

4. **SIP Trunk Management:**
   - Configure proper security settings (TLS, SRTP)
   - Set up appropriate codec negotiation
   - Ensure consistent configuration across all SBCs

5. **Monitoring Integration:**
   - Collect metrics from SIP trunks, SBCs, and Amazon Connect
   - Implement alerts for any routing or connectivity issues
   - Create dashboards for end-to-end visibility

## Conclusion

Implementing Session Border Controllers with Google Cloud Router and AWS Traffic Distribution Groups creates a robust, scalable, and resilient architecture for Amazon Connect. This approach enables true active-active operations across multiple regions while ensuring optimal call quality and customer experience.

By following the implementation steps and best practices outlined in this document, organizations can achieve a high level of reliability and flexibility in their contact center operations, with the ability to handle both planned and unplanned events without customer impact.

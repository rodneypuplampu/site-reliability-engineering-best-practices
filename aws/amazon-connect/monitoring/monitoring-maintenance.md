# Monitoring and Maintenance Guide

Proper monitoring ensures your integration continues to function efficiently and reliably.

## CloudWatch Dashboards

A CloudWatch dashboard template is included in `monitoring/cloudwatch-dashboard.json` that provides visibility into:

- EventBridge Pipe execution metrics
- API Destination invocation success/failure rates
- Lambda function performance (if using Privacy Controls)
- Error rates and latency statistics

### Deploying the Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name platform-connect-integration \
  --dashboard-body file://monitoring/cloudwatch-dashboard.json
```

## Alarms and Notifications

Set up CloudWatch Alarms to be notified of any issues:

1. Navigate to the CloudWatch console
2. Deploy the included alarm template:
```bash
aws cloudformation create-stack \
  --stack-name platform-connect-alarms \
  --template-body file://monitoring/alarms.yaml \
  --parameters ParameterKey=MainStackName,ParameterValue=platform-connect-integration
```

This will create alarms for:
- EventBridge Pipe failures
- API Destination errors
- Lambda function errors and throttling
- Integration latency exceeding thresholds

## Logging and Auditing

All events sent to the platform are logged in multiple locations:

1. **CloudWatch Logs**: 
   - EventBridge Pipe execution logs
   - Lambda function logs (if using Privacy Controls)
   - API Destination connection logs

2. **CloudTrail**:
   - EventBridge API calls
   - Secrets Manager access events
   - IAM role assumption events

To enable enhanced logging:
```bash
aws cloudformation update-stack \
  --stack-name platform-connect-integration \
  --template-body file://cloudformation/connect-integration.yaml \
  --parameters ParameterKey=EnhancedLogging,ParameterValue=true \
  --capabilities CAPABILITY_IAM
```

## Maintenance Tasks

### Regular Updates

Check for updates to the integration at least quarterly:

1. Visit the platform documentation portal
2. Download the latest CloudFormation templates
3. Update your deployment using change sets:
```bash
aws cloudformation create-change-set \
  --stack-name platform-connect-integration \
  --template-body file://cloudformation/connect-integration.yaml \
  --parameters file://cloudformation/parameters/your-parameters.json \
  --capabilities CAPABILITY_IAM \
  --change-set-name version-update
```

### Credential Rotation

API credentials should be rotated periodically:

1. Generate new API credentials in your platform account
2. Update the Secrets Manager secret:
```bash
aws secretsmanager update-secret \
  --secret-id [EventBridge-API-Destination-Secret-ARN] \
  --secret-string '{"ApiKey":"your-new-api-key"}'
```

### Troubleshooting Common Issues

Refer to `docs/troubleshooting.md` for solutions to common issues, including:

- Connection failures
- Data not appearing in the platform
- Permission errors
- Throttling and quota limits

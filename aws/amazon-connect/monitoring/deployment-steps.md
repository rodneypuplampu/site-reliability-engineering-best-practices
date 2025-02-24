# Deployment Steps

Follow these steps to deploy the AWS Integration:

## 1. Prepare Your Environment

1. Log in to your AWS Management Console
2. Ensure you have the necessary permissions to deploy CloudFormation stacks
3. Download the integration package from the provided URL

## 2. Configure Parameters

1. Navigate to the `cloudformation/parameters` directory
2. Copy either `dev-parameters.json` or `prod-parameters.json` to create your own parameter file
3. Edit your parameter file with the following information:
   - API Key (from your platform account)
   - Amazon Connect Instance ARN
   - Region settings
   - Privacy Control options (if needed)

## 3. Deploy the CloudFormation Stack

### Using AWS Console:

1. Open the AWS CloudFormation console
2. Click "Create stack" > "With new resources"
3. Select "Upload a template file" and upload `cloudformation/connect-integration.yaml`
4. Click "Next"
5. Enter a stack name (e.g., "platform-connect-integration")
6. Fill in the parameters based on your configuration file
7. Click "Next" through the remaining screens, reviewing settings
8. Acknowledge IAM resource creation and click "Create stack"

### Using AWS CLI:

```bash
aws cloudformation create-stack \
  --stack-name platform-connect-integration \
  --template-body file://cloudformation/connect-integration.yaml \
  --parameters file://cloudformation/parameters/your-parameters.json \
  --capabilities CAPABILITY_IAM
```

## 4. Verify Deployment

1. Wait for the stack creation to complete (approximately 5-10 minutes)
2. From the CloudFormation console, select the stack and go to the "Outputs" tab
3. Note the EventBridgePipeArn value for reference

## 5. Confirm Data Flow

1. Generate a test call in your Amazon Connect instance
2. Wait for the contact to complete (generating a CTR)
3. Log in to your platform dashboard
4. Verify the contact data appears in the platform interface
5. Check that all expected metrics are being displayed correctly

## 6. Enable Privacy Controls (Optional)

If you need to implement privacy controls:

1. Deploy the privacy module by running:
```bash
aws cloudformation create-stack \
  --stack-name platform-connect-privacy \
  --template-body file://cloudformation/privacy-controls.yaml \
  --parameters ParameterKey=MainStackName,ParameterValue=platform-connect-integration \
  --capabilities CAPABILITY_IAM
```

2. Configure allow/deny lists by editing `lambda/privacy-controls/allowDenyList.js`
3. Update the Lambda function with:
```bash
cd lambda/privacy-controls
zip -r function.zip .
aws lambda update-function-code \
  --function-name platform-privacy-controls \
  --zip-file fileb://function.zip
```

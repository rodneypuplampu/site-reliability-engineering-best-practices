// This implementation demonstrates a global call routing solution using DynamoDB
// It includes the data model, API layer, and Amazon Connect integration

// ------------------------------------------------------------
// 1. DynamoDB Data Model Definition
// ------------------------------------------------------------

// Sample DynamoDB table schemas for call routing

// Main Routing Table
const RoutingTableDefinition = {
  TableName: 'GlobalCallRouting',
  KeySchema: [
    { AttributeName: 'phoneNumber', KeyType: 'HASH' }, // Partition key
    { AttributeName: 'region', KeyType: 'RANGE' }      // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: 'phoneNumber', AttributeType: 'S' },
    { AttributeName: 'region', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'RegionIndex',
      KeySchema: [
        { AttributeName: 'region', KeyType: 'HASH' }
      ],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }
  ],
  BillingMode: 'PAY_PER_REQUEST',
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  },
  TableClass: 'STANDARD',
  DeletionProtectionEnabled: true,
  GlobalTableConfiguration: {
    ReplicationGroup: [
      { RegionName: 'us-east-1' },
      { RegionName: 'eu-west-1' },
      { RegionName: 'ap-southeast-1' }
      // Add more regions as needed
    ]
  }
};

// Agent Skills Table
const AgentSkillsTableDefinition = {
  TableName: 'AgentSkills',
  KeySchema: [
    { AttributeName: 'agentId', KeyType: 'HASH' }  // Partition key
  ],
  AttributeDefinitions: [
    { AttributeName: 'agentId', AttributeType: 'S' }
  ],
  BillingMode: 'PAY_PER_REQUEST',
  GlobalTableConfiguration: {
    ReplicationGroup: [
      { RegionName: 'us-east-1' },
      { RegionName: 'eu-west-1' },
      { RegionName: 'ap-southeast-1' }
    ]
  }
};

// Business Hours Table
const BusinessHoursTableDefinition = {
  TableName: 'BusinessHours',
  KeySchema: [
    { AttributeName: 'regionId', KeyType: 'HASH' }  // Partition key
  ],
  AttributeDefinitions: [
    { AttributeName: 'regionId', AttributeType: 'S' }
  ],
  BillingMode: 'PAY_PER_REQUEST',
  GlobalTableConfiguration: {
    ReplicationGroup: [
      { RegionName: 'us-east-1' },
      { RegionName: 'eu-west-1' },
      { RegionName: 'ap-southeast-1' }
    ]
  }
};

// ------------------------------------------------------------
// 2. Sample Data Structures
// ------------------------------------------------------------

// Sample routing rule entry
const sampleRoutingRule = {
  phoneNumber: '+18005551234',
  region: 'us-east-1',
  routingProfile: 'sales',
  priority: 1,
  fallbackRegions: ['eu-west-1', 'ap-southeast-1'],
  businessHoursId: 'US_BUSINESS',
  contactFlowId: 'arn:aws:connect:us-east-1:123456789012:instance/instance-id/contact-flow/contact-flow-id',
  queueId: 'arn:aws:connect:us-east-1:123456789012:instance/instance-id/queue/queue-id',
  attributes: {
    department: 'sales',
    priority: 'high',
    language: 'en-US'
  },
  lastUpdated: '2025-02-26T12:00:00Z',
  version: 1
};

// Sample agent skills entry
const sampleAgentSkills = {
  agentId: 'agent123',
  name: 'John Doe',
  skills: ['english', 'spanish', 'sales', 'technical'],
  level: {
    sales: 5,
    technical: 3,
    customer_service: 4
  },
  regions: ['us-east-1', 'eu-west-1'],
  schedule: {
    timezone: 'America/New_York',
    shifts: [
      { day: 'monday', start: '09:00', end: '17:00' },
      { day: 'tuesday', start: '09:00', end: '17:00' }
      // Other days...
    ]
  },
  maxConcurrentChats: 3,
  lastUpdated: '2025-02-26T12:00:00Z'
};

// Sample business hours entry
const sampleBusinessHours = {
  regionId: 'US_BUSINESS',
  name: 'US Business Hours',
  timezone: 'America/New_York',
  schedule: {
    monday: { isOpen: true, hours: [{ open: '09:00', close: '17:00' }] },
    tuesday: { isOpen: true, hours: [{ open: '09:00', close: '17:00' }] },
    wednesday: { isOpen: true, hours: [{ open: '09:00', close: '17:00' }] },
    thursday: { isOpen: true, hours: [{ open: '09:00', close: '17:00' }] },
    friday: { isOpen: true, hours: [{ open: '09:00', close: '17:00' }] },
    saturday: { isOpen: false, hours: [] },
    sunday: { isOpen: false, hours: [] }
  },
  holidays: [
    { date: '2025-01-01', name: 'New Year\'s Day' },
    { date: '2025-12-25', name: 'Christmas Day' }
  ],
  emergencyClose: {
    isActive: false,
    message: 'We are currently closed due to unforeseen circumstances.'
  },
  lastUpdated: '2025-02-26T12:00:00Z'
};

// ------------------------------------------------------------
// 3. API Layer Implementation (AWS Lambda)
// ------------------------------------------------------------

// Get routing information for a phone number
async function getRoutingForPhoneNumber(phoneNumber, region) {
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient({ region });
  
  try {
    const params = {
      TableName: 'GlobalCallRouting',
      Key: {
        phoneNumber: phoneNumber,
        region: region
      }
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
      // Try to find a generic routing rule (e.g., default for country code)
      const countryCode = phoneNumber.substring(0, 3); // Example: +1 for US
      const genericParams = {
        TableName: 'GlobalCallRouting',
        FilterExpression: 'begins_with(phoneNumber, :countryCode) AND region = :region',
        ExpressionAttributeValues: {
          ':countryCode': countryCode,
          ':region': region
        },
        Limit: 1
      };
      
      const genericResult = await dynamodb.scan(genericParams).promise();
      
      if (genericResult.Items && genericResult.Items.length > 0) {
        return genericResult.Items[0];
      }
      
      // Check fallback regions
      const fallbackRegions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'].filter(r => r !== region);
      
      for (const fallbackRegion of fallbackRegions) {
        const fbDynamodb = new AWS.DynamoDB.DocumentClient({ region: fallbackRegion });
        const fallbackParams = {
          TableName: 'GlobalCallRouting',
          Key: {
            phoneNumber: phoneNumber,
            region: fallbackRegion
          }
        };
        
        const fallbackResult = await fbDynamodb.get(fallbackParams).promise();
        
        if (fallbackResult.Item) {
          return fallbackResult.Item;
        }
      }
      
      // Return default routing if no specific rule found
      return {
        phoneNumber: 'default',
        region: region,
        contactFlowId: process.env.DEFAULT_CONTACT_FLOW_ID,
        queueId: process.env.DEFAULT_QUEUE_ID
      };
    }
    
    return result.Item;
  } catch (error) {
    console.error('Error getting routing information:', error);
    throw error;
  }
}

// Check if current time is within business hours
async function isWithinBusinessHours(businessHoursId, region) {
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient({ region });
  
  try {
    const params = {
      TableName: 'BusinessHours',
      Key: {
        regionId: businessHoursId
      }
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
      // Default to open if no business hours defined
      return true;
    }
    
    const businessHours = result.Item;
    const now = new Date();
    const timezone = businessHours.timezone || 'UTC';
    
    // Get current day and time in the specified timezone
    const options = { timeZone: timezone, hour12: false };
    const localDateString = now.toLocaleString('en-US', options);
    const localDate = new Date(localDateString);
    
    // Check if today is a holiday
    const todayString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const isHoliday = businessHours.holidays && 
                      businessHours.holidays.some(h => h.date === todayString);
    
    if (isHoliday || businessHours.emergencyClose.isActive) {
      return false;
    }
    
    // Get day of week (lowercase)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[localDate.getDay()];
    
    // Check if the business is open today
    const todaySchedule = businessHours.schedule[dayOfWeek];
    if (!todaySchedule || !todaySchedule.isOpen || !todaySchedule.hours.length) {
      return false;
    }
    
    // Check if current time is within any of the open hours
    const currentHour = localDate.getHours();
    const currentMinute = localDate.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    return todaySchedule.hours.some(period => {
      const [openHour, openMinute] = period.open.split(':').map(Number);
      const [closeHour, closeMinute] = period.close.split(':').map(Number);
      
      const openTimeMinutes = openHour * 60 + openMinute;
      const closeTimeMinutes = closeHour * 60 + closeMinute;
      
      return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes < closeTimeMinutes;
    });
    
  } catch (error) {
    console.error('Error checking business hours:', error);
    // Default to open in case of error
    return true;
  }
}

// Lambda handler for Amazon Connect to call
exports.routeCall = async (event, context) => {
  try {
    const phoneNumber = event.Details.ContactData.CustomerEndpoint.Address;
    const region = event.Details.ContactData.InstanceARN.split(':')[3]; // Extract region from ARN
    
    // Get routing information
    const routingInfo = await getRoutingForPhoneNumber(phoneNumber, region);
    
    // Check business hours
    const withinBusinessHours = await isWithinBusinessHours(routingInfo.businessHoursId, region);
    
    let resultContactFlow;
    let resultQueue;
    
    if (withinBusinessHours) {
      // Use normal business hours flow
      resultContactFlow = routingInfo.contactFlowId;
      resultQueue = routingInfo.queueId;
    } else {
      // Use after-hours flow
      resultContactFlow = routingInfo.afterHoursContactFlowId || process.env.AFTER_HOURS_FLOW_ID;
      resultQueue = routingInfo.afterHoursQueueId || process.env.AFTER_HOURS_QUEUE_ID;
    }
    
    // Return results to Amazon Connect
    return {
      contactFlowId: resultContactFlow,
      queueId: resultQueue,
      attributes: routingInfo.attributes || {}
    };
  } catch (error) {
    console.error('Error in routeCall:', error);
    
    // Return fallback routing in case of error
    return {
      contactFlowId: process.env.DEFAULT_CONTACT_FLOW_ID,
      queueId: process.env.DEFAULT_QUEUE_ID,
      attributes: {
        errorMessage: error.message
      }
    };
  }
};

// ------------------------------------------------------------
// 4. Management API for Updating Routing Rules
// ------------------------------------------------------------

// Update routing rule
exports.updateRoutingRule = async (event, context) => {
  const AWS = require('aws-sdk');
  const body = JSON.parse(event.body);
  
  // Validate input
  if (!body.phoneNumber || !body.region) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'phoneNumber and region are required' })
    };
  }
  
  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient({ region: body.region });
    
    // Add metadata
    body.lastUpdated = new Date().toISOString();
    body.version = (body.version || 0) + 1;
    
    const params = {
      TableName: 'GlobalCallRouting',
      Item: body,
      ConditionExpression: 'attribute_not_exists(version) OR version < :version',
      ExpressionAttributeValues: {
        ':version': body.version
      }
    };
    
    await dynamodb.put(params).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Routing rule updated successfully',
        data: body
      })
    };
  } catch (error) {
    console.error('Error updating routing rule:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error updating routing rule',
        error: error.message
      })
    };
  }
};

// ------------------------------------------------------------
// 5. Amazon Connect Integration
// ------------------------------------------------------------

/*
To integrate with Amazon Connect:

1. Deploy the Lambda functions above
2. Create an AWS Lambda function for the main routing handler
3. Set up a contact flow in Amazon Connect that:
   - Captures the incoming phone number
   - Invokes the Lambda function with the phone number
   - Routes based on the returned contactFlowId and queueId
4. Set up proper IAM permissions for Amazon Connect to invoke Lambda
   and for Lambda to access DynamoDB

Sample Amazon Connect Contact Flow (pseudo-code):
1. Start -> Get Customer Input (phone number)
2. Invoke AWS Lambda Function (routeCall)
3. Check Result -> Branch based on returned contactFlowId
4. Route to appropriate queue using returned queueId
5. Set contact attributes from returned attributes
*/

// ------------------------------------------------------------
// 6. Deployment Script (AWS CDK)
// ------------------------------------------------------------

// For actual deployment, you would use AWS CDK or CloudFormation
// Here's a sample CDK snippet for creating the DynamoDB tables

/*
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

export class GlobalCallRoutingStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB tables
    const routingTable = new dynamodb.Table(this, 'GlobalCallRouting', {
      partitionKey: { name: 'phoneNumber', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'region', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      replicationRegions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Create Lambda functions
    const routeCallFunction = new lambda.Function(this, 'RouteCallFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.routeCall',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        DEFAULT_CONTACT_FLOW_ID: 'default-flow-id',
        DEFAULT_QUEUE_ID: 'default-queue-id',
        AFTER_HOURS_FLOW_ID: 'after-hours-flow-id',
        AFTER_HOURS_QUEUE_ID: 'after-hours-queue-id'
      }
    });

    // Grant Lambda permissions to access DynamoDB
    routingTable.grantReadData(routeCallFunction);
  }
}
*/

// ------------------------------------------------------------
// 7. Monitoring and Maintenance
// ------------------------------------------------------------

// CloudWatch Dashboard for monitoring
const cloudwatchDashboardJSON = {
  widgets: [
    {
      type: 'metric',
      properties: {
        metrics: [
          ['AWS/DynamoDB', 'SuccessfulRequestLatency', 'TableName', 'GlobalCallRouting', 'Operation', 'GetItem'],
          ['AWS/DynamoDB', 'SuccessfulRequestLatency', 'TableName', 'GlobalCallRouting', 'Operation', 'PutItem']
        ],
        view: 'timeSeries',
        stacked: false,
        region: 'us-east-1',
        title: 'DynamoDB Latency',
        period: 300
      }
    },
    {
      type: 'metric',
      properties: {
        metrics: [
          ['AWS/Lambda', 'Invocations', 'FunctionName', 'routeCall'],
          ['AWS/Lambda', 'Errors', 'FunctionName', 'routeCall']
        ],
        view: 'timeSeries',
        stacked: false,
        region: 'us-east-1',
        title: 'Lambda Invocations and Errors',
        period: 300
      }
    }
  ]
};

// ------------------------------------------------------------
// 8. Failover Implementation
// ------------------------------------------------------------

// Implement a health check Lambda function that monitors all regions
exports.healthCheck = async (event, context) => {
  const AWS = require('aws-sdk');
  const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
  const results = {};
  
  for (const region of regions) {
    try {
      const dynamodb = new AWS.DynamoDB({ region });
      
      // Test if the table is accessible
      const response = await dynamodb.describeTable({ TableName: 'GlobalCallRouting' }).promise();
      
      results[region] = {
        status: 'healthy',
        tableStatus: response.Table.TableStatus
      };
    } catch (error) {
      results[region] = {
        status: 'unhealthy',
        error: error.message
      };
      
      // Publish an SNS alert for unhealthy regions
      try {
        const sns = new AWS.SNS({ region: 'us-east-1' });
        await sns.publish({
          TopicArn: process.env.ALERT_TOPIC_ARN,
          Subject: `DynamoDB Region ${region} Unhealthy`,
          Message: `The DynamoDB Global Table in region ${region} is reporting errors: ${error.message}`
        }).promise();
      } catch (snsError) {
        console.error('Error publishing SNS alert:', snsError);
      }
    }
  }
  
  // Log results
  console.log('Health check results:', results);
  
  return {
    statusCode: 200,
    body: JSON.stringify(results)
  };
};

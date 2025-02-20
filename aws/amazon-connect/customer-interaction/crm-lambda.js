const AWS = require('aws-sdk');
const axios = require('axios');

// CRM API client class
class CRMClient {
    constructor() {
        this.secretsManager = new AWS.SecretsManager();
        this.baseUrl = process.env.CRM_API_URL;
        this.apiKey = null;
    }

    async initialize() {
        if (!this.apiKey) {
            const secret = await this.secretsManager.getSecretValue({
                SecretId: process.env.CRM_API_KEY_SECRET
            }).promise();
            this.apiKey = JSON.parse(secret.SecretString).apiKey;
        }
    }

    async lookupCustomer(phoneNumber) {
        await this.initialize();
        
        try {
            const response = await axios.get(`${this.baseUrl}/customers/lookup`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    phoneNumber: this.normalizePhoneNumber(phoneNumber)
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error looking up customer:', error);
            throw new Error('Failed to lookup customer in CRM');
        }
    }

    async getOpenCases(customerId) {
        await this.initialize();
        
        try {
            const response = await axios.get(`${this.baseUrl}/cases`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    customerId,
                    status: 'open'
                }
            });

            return response.data.cases;
        } catch (error) {
            console.error('Error getting open cases:', error);
            throw new Error('Failed to retrieve open cases from CRM');
        }
    }

    normalizePhoneNumber(phoneNumber) {
        // Remove any non-numeric characters
        return phoneNumber.replace(/\D/g, '');
    }
}

// Lambda handler
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    const crm = new CRMClient();
    
    try {
        // Get phone number from contact flow
        const phoneNumber = event.Details.ContactData.CustomerEndpoint.Address;
        
        // Lookup customer information
        const customerInfo = await crm.lookupCustomer(phoneNumber);
        
        // If customer found, check for open cases
        if (customerInfo) {
            const openCases = await crm.getOpenCases(customerInfo.customerId);
            
            if (openCases && openCases.length > 0) {
                // Return customer info with open case details
                return {
                    statusCode: 200,
                    customerName: customerInfo.name,
                    hasOpenCase: true,
                    caseNumber: openCases[0].caseNumber,
                    caseSummary: openCases[0].summary,
                    caseType: openCases[0].type,
                    assignedTeam: openCases[0].assignedTeam
                };
            }
            
            // Return customer info without case details
            return {
                statusCode: 200,
                customerName: customerInfo.name,
                hasOpenCase: false
            };
        }
        
        // No customer found
        return {
            statusCode: 404,
            hasOpenCase: false,
            message: 'Customer not found'
        };
        
    } catch (error) {
        console.error('Error processing request:', error);
        
        return {
            statusCode: 500,
            error: error.message || 'Internal server error',
            hasOpenCase: false
        };
    }
};

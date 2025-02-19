# Amazon Connect RAG Integration

This project implements a RAG (Retrieval-Augmented Generation) system integration with Amazon Connect, utilizing AWS Lambda and SageMaker for natural language processing of customer interactions.

## Project Structure

```
connect-rag-integration/
├── README.md
├── .gitignore
├── requirements.txt
├── setup.py
├── tests/
│   ├── __init__.py
│   ├── test_handler.py
│   ├── test_processor.py
│   └── fixtures/
│       ├── connect_event.json
│       └── sagemaker_response.json
├── src/
│   ├── __init__.py
│   ├── lambda_function.py
│   ├── connect/
│   │   ├── __init__.py
│   │   ├── processor.py
│   │   └── utils.py
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── client.py
│   │   └── config.py
│   └── monitoring/
│       ├── __init__.py
│       ├── metrics.py
│       └── logger.py
├── connect-flow/
│   └── contact_flow.json
├── infrastructure/
│   ├── README.md
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── cloudformation/
│       └── template.yaml
└── docs/
    ├── architecture.md
    ├── configuration.md
    ├── deployment.md
    └── monitoring.md
```

## Prerequisites

- AWS Account with appropriate permissions
- Python 3.8+
- Terraform (for infrastructure deployment)
- AWS CLI configured
- Amazon Connect instance
- SageMaker endpoint with deployed RAG model

## Environment Variables

```bash
SAGEMAKER_ENDPOINT=your-endpoint-name
CONFIDENCE_THRESHOLD=0.7
MAX_RETRIES=3
LOG_LEVEL=INFO
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/connect-rag-integration.git
cd connect-rag-integration
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Development Setup

1. Install development dependencies:
```bash
pip install -r requirements-dev.txt
```

2. Set up pre-commit hooks:
```bash
pre-commit install
```

3. Configure AWS credentials:
```bash
aws configure
```

## Deployment

### Infrastructure Deployment (Terraform)

1. Initialize Terraform:
```bash
cd infrastructure/terraform
terraform init
```

2. Deploy infrastructure:
```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### Lambda Deployment

1. Build the Lambda package:
```bash
./scripts/build_lambda.sh
```

2. Deploy using Terraform:
```bash
terraform apply -var="lambda_package_path=../../dist/lambda.zip"
```

## Testing

### Unit Tests
```bash
pytest tests/
```

### Integration Tests
```bash
pytest tests/integration/ --environment=dev
```

## Architecture Components

### 1. Contact Flow
- Handles incoming customer interactions
- Routes to appropriate Lambda functions
- Manages conversation flow

### 2. Lambda Function
- Processes customer input
- Integrates with RAG system
- Handles response formatting
- Manages error scenarios

### 3. RAG System
- Connects to SageMaker endpoint
- Retrieves relevant context
- Generates natural language responses

### 4. Monitoring
- CloudWatch metrics
- Performance monitoring
- Error tracking
- Usage analytics

## Security

- IAM roles and permissions are managed through Terraform
- Secrets are stored in AWS Secrets Manager
- All data in transit is encrypted
- Lambda functions run in VPC with appropriate security groups

## Monitoring and Logging

### CloudWatch Metrics

Key metrics:
- RAGLatency
- QueryConfidence
- SuccessfulQuery
- FailedQuery

### Logging

Log groups:
- /aws/lambda/connect-rag-handler
- /aws/connect/contact-flow

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Support

For support, please contact:
- Team Email: team@example.com
- Slack Channel: #connect-rag-support

## Authors

- Your Name (@githubhandle)
- Team Members

## Acknowledgments

- Amazon Connect team
- SageMaker team
- Open source contributors

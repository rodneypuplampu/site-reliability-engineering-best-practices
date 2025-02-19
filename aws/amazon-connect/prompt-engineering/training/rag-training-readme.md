# RAG Training Pipeline with SageMaker and Weaviate

A comprehensive pipeline for training and deploying RAG (Retrieval Augmented Generation) models using Amazon SageMaker, Weaviate vector database, and LangGraph for workflow orchestration.

## Features

### Vector Database Management
- Weaviate integration for efficient vector storage
- Automated schema creation and management
- Batch processing for embeddings
- Metadata management

### Embedding Generation
- HuggingFace Sentence Transformers integration
- Configurable embedding models
- Batch processing capabilities
- Efficient vector storage

### SageMaker Integration
- Automated model deployment
- Endpoint management
- Scalable inference
- Model monitoring

### LangGraph Orchestration
- Workflow management
- Tool integration
- Conversation state management
- Error handling

## Prerequisites

- Python 3.8+
- AWS Account with SageMaker access
- Weaviate instance
- Required Python packages:
  ```
  boto3>=1.26.0
  weaviate-client>=3.0.0
  langchain>=0.0.200
  langgraph>=0.0.10
  transformers>=4.0.0
  ```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/rag-training-pipeline
cd rag-training-pipeline
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure AWS credentials:
```bash
aws configure
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configurations
```

## Configuration

Example configuration:
```python
config = {
    'weaviate_url': 'http://localhost:8080',
    'weaviate_api_key': 'your-api-key',
    'embedding_model': 'sentence-transformers/all-mpnet-base-v2',
    'model_name': 'google/flan-t5-base',
    'region': 'us-west-2',
    'role_arn': 'your-role-arn',
    'container_image': 'your-container-image'
}
```

## Usage

### Basic Usage

```python
from rag_training_pipeline import RAGTrainingPipeline

# Initialize pipeline
pipeline = RAGTrainingPipeline(config)

# Create schema
pipeline.create_schema()

# Process chunks and generate embeddings
chunks = [
    {"content": "Example content 1", "metadata": {"source": "doc1"}},
    {"content": "Example content 2", "metadata": {"source": "doc2"}}
]
pipeline.generate_embeddings(chunks)

# Deploy model
endpoint_name = pipeline.deploy_sagemaker_endpoint("s3://bucket/model.tar.gz")

# Set up LangGraph
tool_executor = pipeline.setup_langgraph(endpoint_name)

# Process query
result = asyncio.run(pipeline.process_query(
    "How does RAG work?",
    tool_executor
))
```

## Pipeline Components

### 1. Vector Database Setup
- Schema creation
- Index management
- Data ingestion
- Vector storage

### 2. Embedding Generation
- Text preprocessing
- Embedding model configuration
- Batch processing
- Quality checks

### 3. Model Deployment
- SageMaker endpoint creation
- Configuration management
- Scaling settings
- Monitoring setup

### 4. LangGraph Integration
- Tool configuration
- Workflow definition
- State management
- Error handling

## Best Practices

### Data Preparation
- Clean and preprocess text data
- Maintain consistent chunk sizes
- Include relevant metadata
- Validate data quality

### Model Deployment
- Start with smaller instances
- Monitor endpoint performance
- Set up auto-scaling
- Implement error handling

### Vector Database
- Optimize chunk size
- Use batch operations
- Monitor database performance
- Regular maintenance

### LangGraph
- Define clear workflows
- Handle edge cases
- Implement retry logic
- Monitor tool performance

## Monitoring

The pipeline includes monitoring for:
- Embedding generation
- Vector database operations
- SageMaker endpoint performance
- LangGraph workflow execution

## Error Handling

The pipeline implements comprehensive error handling for:
- Data validation
- Embedding generation
- Model deployment
- Query processing

## Development

### Local Development
1. Set up local Weaviate instance
2. Configure development environment
3. Run tests
4. Implement features

### Testing
```bash
# Run tests
pytest tests/

# Run specific test
pytest tests/test_embeddings.py
```

## Project Structure

```
rag-training-pipeline/
├── src/
│   ├── embedding/
│   ├── database/
│   ├── model/
│   └── workflow/
├── tests/
├── examples/
└── docs/
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

For support, please contact the team at [support@your-org.com](mailto:support@your-org.com)

---
Built with ❤️ by Your Organization Team
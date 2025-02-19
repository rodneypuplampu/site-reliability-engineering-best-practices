# Amazon Connect Data Preparation Pipeline

A robust data preparation pipeline designed to process and clean various data sources for RAG-enabled conversational AI systems in Amazon Connect. This pipeline handles voice data, unstructured documents, and QA pairs, preparing them for use in large language models and vector databases.

## Features

### Voice Data Processing
- Automated transcription using Amazon Transcribe
- Multi-speaker detection and labeling
- Support for multiple audio formats
- Batch processing capabilities

### Document Processing
- Multi-format support:
  - PDF documents
  - Text files
  - CSV files
  - Structured documents
- Recursive directory scanning
- Metadata preservation
- Batch processing

### Data Cleaning
- Standardized text formatting
- Special character handling
- Whitespace normalization
- Punctuation preservation
- Language standardization

### Text Chunking
- LangChain-based text splitting
- Configurable chunk sizes
- Adjustable overlap settings
- Context preservation
- Intelligent separator handling

## Prerequisites

- Python 3.8+
- AWS Account with appropriate permissions
- Required Python packages:
  ```
  boto3>=1.26.0
  langchain>=0.0.200
  python-dotenv>=0.19.0
  ```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/connect-data-pipeline
cd connect-data-pipeline
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

## Directory Structure

```
data/
├── raw/           # Original input files
├── transcribed/   # Transcribed voice data
├── extracted/     # Extracted document text
├── cleaned/       # Cleaned text data
└── chunks/        # Final text chunks
```

## Usage

### Basic Usage

```python
from data_prep_pipeline import DataPrepPipeline

# Configure the pipeline
config = {
    'chunk_size': 1000,
    'chunk_overlap': 200,
    'language': 'en-US',
    'output_path': 'data/processed'
}

# Initialize pipeline
pipeline = DataPrepPipeline(config)

# Prepare input configuration
input_config = {
    'voice_files': ['data/raw/call1.mp3', 'data/raw/call2.mp3'],
    'document_path': 'data/raw/documents',
    'qa_pairs': [
        {
            'question': 'How do I reset my password?',
            'answer': 'Go to settings and click reset password'
        }
    ]
}

# Run pipeline
import asyncio
stats = asyncio.run(pipeline.run_pipeline(input_config))
print(f"Pipeline Statistics: {json.dumps(stats, indent=2)}")
```

### Advanced Configuration

#### Voice Processing Settings
```python
config = {
    'transcribe_settings': {
        'ShowSpeakerLabels': True,
        'MaxSpeakerLabels': 2,
        'VocabularyName': 'custom_vocabulary',
        'LanguageModelName': 'custom_language_model'
    }
}
```

#### Chunking Settings
```python
config = {
    'chunk_size': 1000,
    'chunk_overlap': 200,
    'separators': ["\n\n", "\n", " ", ""],
    'length_function': len
}
```

## Pipeline Workflow

1. **Data Collection**
   - Voice files are gathered from specified sources
   - Documents are collected from specified directories
   - QA pairs are loaded from input configuration

2. **Voice Processing**
   - Audio files are transcribed using Amazon Transcribe
   - Speaker labels are added if configured
   - Transcripts are saved to the transcribed directory

3. **Document Processing**
   - Documents are processed based on their format
   - Text is extracted and preserved
   - Metadata is maintained where relevant

4. **Data Cleaning**
   - Text is standardized and normalized
   - Special characters are handled
   - Format is unified across all sources

5. **Chunking**
   - Text is split into manageable chunks
   - Overlap is maintained for context
   - Chunks are saved in JSON format

## Output Format

### Chunks Directory
```json
{
    "chunk_id": "voice_call1_001",
    "text": "processed text content",
    "metadata": {
        "source": "voice_call1.mp3",
        "timestamp": "2024-02-19T10:30:00",
        "speaker": "speaker_1"
    }
}
```

### QA Pairs
```json
{
    "question": "processed question text",
    "answer": "processed answer text",
    "metadata": {
        "source": "qa_pairs",
        "category": "technical_support"
    }
}
```

## Error Handling

The pipeline includes comprehensive error handling:
- Failed transcriptions are logged and reported
- Document processing errors are caught and documented
- Data validation at each stage
- Detailed error messages and suggestions

## Monitoring and Logging

- Pipeline progress is logged to `pipeline.log`
- Processing statistics are generated for each run
- Error reports are saved to `errors.log`
- Performance metrics are tracked

## Best Practices

1. **Data Organization**
   - Keep raw data in the `raw` directory
   - Maintain consistent file naming
   - Use appropriate file formats

2. **Configuration**
   - Start with default settings
   - Adjust chunk size based on content
   - Monitor and adjust overlap settings

3. **Performance**
   - Process files in batches
   - Monitor memory usage
   - Use appropriate chunk sizes

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

For support, please contact the team at [support@your-org.com](mailto:support@your-org.com)

---
Built with ❤️ by Your Organization Team

## Project Structure

```
connect-data-pipeline/
├── .env                    # Environment variables
├── .gitignore             # Git ignore file
├── README.md              # Project documentation
├── requirements.txt       # Python dependencies
├── setup.py              # Package setup file
│
├── data/                 # Data directory
│   ├── raw/             # Original input files
│   │   ├── audio/       # Raw audio files
│   │   ├── documents/   # Raw documents
│   │   └── qa_pairs/    # Raw QA pairs
│   ├── transcribed/     # Transcribed voice data
│   ├── extracted/       # Extracted document text
│   ├── cleaned/         # Cleaned text data
│   └── chunks/          # Final text chunks
│
├── src/                  # Source code
│   ├── __init__.py
│   ├── config/          # Configuration files
│   │   ├── __init__.py
│   │   └── settings.py  # Default settings
│   │
│   ├── processors/      # Data processors
│   │   ├── __init__.py
│   │   ├── voice.py     # Voice processing
│   │   ├── document.py  # Document processing
│   │   └── qa.py        # QA pair processing
│   │
│   ├── cleaning/        # Text cleaning modules
│   │   ├── __init__.py
│   │   ├── normalizer.py
│   │   └── sanitizer.py
│   │
│   ├── chunking/        # Text chunking modules
│   │   ├── __init__.py
│   │   └── splitter.py
│   │
│   └── utils/           # Utility functions
│       ├── __init__.py
│       ├── aws.py       # AWS helpers
│       ├── logger.py    # Logging configuration
│       └── validators.py # Input validation
│
├── tests/               # Test files
│   ├── __init__.py
│   ├── test_voice.py
│   ├── test_document.py
│   ├── test_qa.py
│   ├── test_cleaning.py
│   └── test_chunking.py
│
├── examples/            # Example usage
│   ├── basic_usage.py
│   ├── advanced_config.py
│   └── batch_processing.py
│
├── scripts/             # Utility scripts
│   ├── setup_aws.sh
│   ├── install_deps.sh
│   └── run_pipeline.sh
│
└── docs/               # Additional documentation
    ├── API.md
    ├── CONFIGURATION.md
    ├── CONTRIBUTING.md
    └── CHANGELOG.md
```

### Key Components:

1. **Source Code (`src/`)**
   - Modular organization of core functionality
   - Separate processors for different data types
   - Utility functions and helpers
   - Configuration management

2. **Data Directory (`data/`)**
   - Structured storage of all data stages
   - Clear separation of raw and processed data
   - Organized by data type and processing stage

3. **Tests (`tests/`)**
   - Comprehensive test coverage
   - Separate test files for each module
   - Integration tests for full pipeline

4. **Documentation (`docs/`)**
   - Detailed API documentation
   - Configuration guides
   - Contribution guidelines
   - Change history

5. **Examples (`examples/`)**
   - Basic usage demonstrations
   - Advanced configuration examples
   - Batch processing templates

6. **Scripts (`scripts/`)**
   - Automation scripts
   - Setup helpers
   - Pipeline execution utilities

This structure follows Python best practices and provides a clean, maintainable organization for the data preparation pipeline.

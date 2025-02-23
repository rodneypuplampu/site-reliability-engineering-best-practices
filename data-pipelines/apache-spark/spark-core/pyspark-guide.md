# PySpark Batch Processing Pipeline Guide

This guide provides step-by-step instructions for setting up and running a PySpark batch processing pipeline for customer survey analysis.

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Data Ingestion](#data-ingestion)
3. [Data Processing](#data-processing)
4. [Quality Control](#quality-control)
5. [Output Management](#output-management)
6. [Pipeline Orchestration](#pipeline-orchestration)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Environment Setup

### Prerequisites
- Apache Spark 3.x
- Python 3.8+
- Apache Airflow 2.x (for scheduling)
- AWS S3 or equivalent storage solution

### Installation Steps
1. Install PySpark:
```bash
pip install pyspark==3.4.0
```

2. Configure Spark environment variables:
```bash
export SPARK_HOME=/path/to/spark
export PYTHONPATH=$SPARK_HOME/python:$PYTHONPATH
```

3. Install additional dependencies:
```bash
pip install apache-airflow pandas numpy
```

## Data Ingestion

### Source Configuration
1. Define data source locations in a configuration file:
```python
# config.py
SOURCE_CONFIG = {
    'survey_data': 's3://bucket/customer_surveys/',
    'profile_data': 's3://bucket/customer_profiles/',
    'schema_path': './schemas/'
}
```

2. Implement schema validation:
```python
from pyspark.sql.types import StructType, StructField, StringType, IntegerType

survey_schema = StructType([
    StructField("customer_id", StringType(), False),
    StructField("survey_date", StringType(), False),
    StructField("survey_score", IntegerType(), True),
    StructField("feedback", StringType(), True)
])
```

### Data Loading
```python
def load_data(spark, config):
    survey_df = spark.read.schema(survey_schema)\
        .option("mode", "FAILFAST")\
        .csv(config['survey_data'])
    
    profile_df = spark.read.parquet(config['profile_data'])
    return survey_df, profile_df
```

## Data Processing

### Data Cleaning Functions
```python
def clean_survey_data(df):
    return df.dropDuplicates(['customer_id', 'survey_date'])\
        .na.fill({'survey_score': 0})\
        .filter(df.survey_date >= '2024-01-01')

def clean_profile_data(df):
    return df.dropDuplicates(['customer_id'])\
        .na.drop(subset=['customer_id'])
```

### Data Transformation
```python
def transform_data(survey_df, profile_df):
    # Join datasets
    joined_df = survey_df.join(
        profile_df,
        on='customer_id',
        how='inner'
    )
    
    # Calculate metrics
    result_df = joined_df.groupBy('customer_segment')\
        .agg({
            'survey_score': 'avg',
            'customer_id': 'count'
        })\
        .withColumnRenamed('avg(survey_score)', 'avg_score')\
        .withColumnRenamed('count(customer_id)', 'response_count')
    
    return result_df
```

## Quality Control

### Data Quality Checks
```python
def run_quality_checks(df):
    checks = {
        'null_check': df.filter(df.customer_id.isNull()).count() == 0,
        'score_range': df.filter((df.survey_score < 0) | (df.survey_score > 10)).count() == 0,
        'duplicate_check': df.count() == df.dropDuplicates().count()
    }
    
    return all(checks.values()), checks
```

### Logging and Error Handling
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pipeline.log'),
        logging.StreamHandler()
    ]
)

def handle_processing_error(error, stage):
    logging.error(f"Error in {stage}: {str(error)}")
    raise Exception(f"Pipeline failed at {stage}")
```

## Output Management

### Output Configuration
```python
OUTPUT_CONFIG = {
    'format': 'parquet',
    'path': 's3://bucket/processed_data/',
    'partition_cols': ['survey_date'],
    'mode': 'overwrite'
}
```

### Writing Results
```python
def save_results(df, config):
    df.write\
        .partitionBy(config['partition_cols'])\
        .format(config['format'])\
        .mode(config['mode'])\
        .save(config['path'])
```

## Pipeline Orchestration

### Airflow DAG Configuration
```python
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data_team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email': ['data_team@company.com'],
    'email_on_failure': True,
    'retries': 3,
    'retry_delay': timedelta(minutes=5)
}

dag = DAG(
    'customer_survey_pipeline',
    default_args=default_args,
    description='Weekly customer survey analysis',
    schedule_interval='@weekly'
)
```

### Main Pipeline Function
```python
def run_pipeline():
    try:
        # Initialize Spark session
        spark = SparkSession.builder\
            .appName("CustomerSurveyAnalysis")\
            .config("spark.memory.fraction", "0.8")\
            .config("spark.executor.memory", "4g")\
            .getOrCreate()
        
        # Load data
        survey_df, profile_df = load_data(spark, SOURCE_CONFIG)
        
        # Clean data
        clean_survey = clean_survey_data(survey_df)
        clean_profile = clean_profile_data(profile_df)
        
        # Transform data
        result_df = transform_data(clean_survey, clean_profile)
        
        # Run quality checks
        passed, check_results = run_quality_checks(result_df)
        if not passed:
            raise Exception(f"Quality checks failed: {check_results}")
        
        # Save results
        save_results(result_df, OUTPUT_CONFIG)
        
    except Exception as e:
        handle_processing_error(e, "main_pipeline")
    finally:
        spark.stop()
```

## Monitoring and Maintenance

### Performance Monitoring
- Set up Spark UI monitoring (default port: 4040)
- Configure Prometheus metrics collection
- Create Grafana dashboards for visualization

### Maintenance Tasks
1. Regular cleanup of temporary files:
```python
def cleanup_temp_files():
    # Implementation details
    pass
```

2. Log rotation:
```python
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'pipeline.log',
    maxBytes=10000000,
    backupCount=5
)
```

### Troubleshooting Guide
1. Check Spark UI for:
   - Stage failures
   - Memory issues
   - Data skew problems

2. Common Issues and Solutions:
   - Out of Memory: Adjust `spark.memory.fraction` and executor memory
   - Data Skew: Implement salting or repartitioning
   - Performance: Enable caching for frequently used DataFrames

## Security Considerations

### Data Protection
1. Enable encryption:
```python
spark.conf.set("spark.hadoop.fs.s3a.encryption.enabled", "true")
```

2. Implement access controls:
```python
spark.conf.set("spark.hadoop.fs.s3a.acl.default", "private")
```

### Authentication
```python
spark.conf.set("spark.hadoop.fs.s3a.aws.credentials.provider", 
    "com.amazonaws.auth.DefaultAWSCredentialsProviderChain")
```

## Best Practices

1. Code Organization:
   - Use modular functions
   - Implement proper error handling
   - Follow PEP 8 style guide

2. Performance Optimization:
   - Cache frequently used DataFrames
   - Use appropriate partitioning
   - Implement broadcast joins for small tables

3. Monitoring:
   - Set up alerts for pipeline failures
   - Monitor resource usage
   - Track data quality metrics

4. Documentation:
   - Maintain detailed documentation
   - Document all configuration parameters
   - Keep track of changes in a changelog

---

For more information or support, contact the data engineering team at data_engineering@company.com
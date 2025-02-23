# Spark System Implementation Guide

## Table of Contents
- [1. Environment Setup](#1-environment-setup)
- [2. Cluster Configuration](#2-cluster-configuration)
- [3. Application Structure](#3-application-structure)
- [4. Data Ingestion Pipeline](#4-data-ingestion-pipeline)
- [5. Deployment Process](#5-deployment-process)
- [6. Monitoring Setup](#6-monitoring-setup)

## 1. Environment Setup

### Base Environment Configuration

```bash
# Create project directory
mkdir spark-production && cd spark-production

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install base requirements
pip install pyspark==3.4.0 delta-spark==2.4.0 pytest pytest-cov black isort
```

### Project Dependencies (requirements.txt)
```text
pyspark==3.4.0
delta-spark==2.4.0
pytest==7.3.1
pytest-cov==4.1.0
black==23.3.0
isort==5.12.0
py4j==0.10.9.7
pandas==2.0.0
great-expectations==0.15.47
```

### Environment Variables (.env)
```bash
# Spark Configuration
export SPARK_HOME=/opt/spark
export PYTHON_PATH=/opt/spark/python
export PYSPARK_PYTHON=python3
export PYSPARK_DRIVER_PYTHON=python3

# AWS Configuration (if using EMR)
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-west-2
```

## 2. Cluster Configuration

### Spark Configuration (spark-defaults.conf)
```conf
spark.master                     yarn
spark.driver.memory             4g
spark.executor.memory           4g
spark.executor.cores            2
spark.executor.instances        4
spark.serializer               org.apache.spark.serializer.KryoSerializer
spark.sql.extensions           io.delta.sql.DeltaSparkSessionExtension
spark.sql.catalog.spark_catalog org.apache.spark.sql.delta.catalog.DeltaCatalog
```

### YARN Configuration (yarn-site.xml)
```xml
<configuration>
    <property>
        <name>yarn.nodemanager.resource.memory-mb</name>
        <value>16384</value>
    </property>
    <property>
        <name>yarn.scheduler.maximum-allocation-mb</name>
        <value>16384</value>
    </property>
    <property>
        <name>yarn.scheduler.minimum-allocation-mb</name>
        <value>1024</value>
    </property>
</configuration>
```

### Log4j Configuration (log4j.properties)
```properties
log4j.rootCategory=INFO, console
log4j.appender.console=org.apache.log4j.ConsoleAppender
log4j.appender.console.target=System.err
log4j.appender.console.layout=org.apache.log4j.PatternLayout
log4j.appender.console.layout.ConversionPattern=%d{yy/MM/dd HH:mm:ss} %p %c{1}: %m%n
```

## 3. Application Structure

### Project Structure
```
spark-production/
├── src/
│   ├── ingestion/
│   │   ├── __init__.py
│   │   ├── readers.py
│   │   └── writers.py
│   ├── processing/
│   │   ├── __init__.py
│   │   └── transformers.py
│   └── utils/
│       ├── __init__.py
│       └── spark_session.py
├── config/
│   ├── spark-defaults.conf
│   └── log4j.properties
├── tests/
│   ├── __init__.py
│   ├── test_readers.py
│   └── test_transformers.py
├── requirements.txt
└── setup.py
```

### Spark Session Configuration (spark_session.py)
```python
from pyspark.sql import SparkSession

def create_spark_session(app_name: str, configs: dict = None) -> SparkSession:
    """Create a Spark session with specified configurations."""
    builder = SparkSession.builder.appName(app_name)
    
    # Add default configurations
    builder = builder.config("spark.sql.extensions", 
                           "io.delta.sql.DeltaSparkSessionExtension")
    builder = builder.config("spark.sql.catalog.spark_catalog",
                           "org.apache.spark.sql.delta.catalog.DeltaCatalog")
    
    # Add custom configurations
    if configs:
        for key, value in configs.items():
            builder = builder.config(key, value)
    
    return builder.getOrCreate()
```

## 4. Data Ingestion Pipeline

### Data Reader Implementation (readers.py)
```python
from typing import Dict, Any
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.types import StructType

class DataReader:
    def __init__(self, spark: SparkSession):
        self.spark = spark

    def read_csv(
        self,
        path: str,
        schema: StructType = None,
        options: Dict[str, Any] = None
    ) -> DataFrame:
        reader = self.spark.read.format("csv")
        
        if schema:
            reader = reader.schema(schema)
        
        if options:
            for key, value in options.items():
                reader = reader.option(key, value)
        
        return reader.load(path)

    def read_delta(
        self,
        path: str,
        version: int = None
    ) -> DataFrame:
        reader = self.spark.read.format("delta")
        
        if version:
            reader = reader.option("versionAsOf", version)
        
        return reader.load(path)
```

### Data Writer Implementation (writers.py)
```python
from typing import Dict, Any
from pyspark.sql import DataFrame

class DataWriter:
    @staticmethod
    def write_delta(
        df: DataFrame,
        path: str,
        mode: str = "overwrite",
        partition_by: list = None,
        options: Dict[str, Any] = None
    ) -> None:
        writer = df.write.format("delta").mode(mode)
        
        if partition_by:
            writer = writer.partitionBy(*partition_by)
            
        if options:
            for key, value in options.items():
                writer = writer.option(key, value)
                
        writer.save(path)
```

## 5. Deployment Process

### Application Packaging (setup.py)
```python
from setuptools import setup, find_packages

setup(
    name="spark-production",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "pyspark>=3.4.0",
        "delta-spark>=2.4.0",
    ],
    python_requires=">=3.8",
)
```

### Deployment Script (deploy.sh)
```bash
#!/bin/bash

# Build the package
python setup.py bdist_egg

# Submit to cluster
spark-submit \
    --master yarn \
    --deploy-mode cluster \
    --conf spark.executor.memory=4g \
    --conf spark.executor.cores=2 \
    --conf spark.executor.instances=4 \
    --py-files dist/spark_production-1.0.0-py3.8.egg \
    src/main.py
```

## 6. Monitoring Setup

### Monitoring Configuration (metrics.properties)
```properties
*.sink.graphite.class=org.apache.spark.metrics.sink.GraphiteSink
*.sink.graphite.host=graphite.example.com
*.sink.graphite.port=2003
*.sink.graphite.period=10
*.sink.graphite.unit=seconds
```

### Health Check Implementation
```python
from datetime import datetime
from typing import Dict, Any

class HealthCheck:
    @staticmethod
    def check_data_freshness(
        df: DataFrame,
        timestamp_col: str,
        max_delay_minutes: int = 60
    ) -> Dict[str, Any]:
        latest_timestamp = df.agg({timestamp_col: "max"}).collect()[0][0]
        delay = (datetime.now() - latest_timestamp).total_seconds() / 60
        
        return {
            "status": "healthy" if delay <= max_delay_minutes else "unhealthy",
            "delay_minutes": delay,
            "threshold_minutes": max_delay_minutes
        }
```

### Usage Example

```python
from utils.spark_session import create_spark_session
from ingestion.readers import DataReader
from ingestion.writers import DataWriter

def main():
    # Create Spark session
    spark = create_spark_session("DataIngestionPipeline")
    
    # Initialize components
    reader = DataReader(spark)
    
    # Read data
    df = reader.read_csv(
        path="s3://bucket/raw/data.csv",
        options={
            "header": "true",
            "inferSchema": "true"
        }
    )
    
    # Process data
    processed_df = df.transform(some_transformation)
    
    # Write data
    DataWriter.write_delta(
        df=processed_df,
        path="s3://bucket/processed/data",
        partition_by=["date"],
        options={
            "mergeSchema": "true"
        }
    )

if __name__ == "__main__":
    main()
```

Remember to:
1. Adjust configurations based on your specific cluster resources
2. Implement proper error handling and logging
3. Add data quality checks before processing
4. Set up monitoring and alerting
5. Regularly test and validate the pipeline

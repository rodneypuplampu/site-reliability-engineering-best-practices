# Spark Data Processing Implementation Guide

## Table of Contents
- [1. Data Processing Components](#1-data-processing-components)
- [2. Data Quality Framework](#2-data-quality-framework)
- [3. Feature Engineering Pipeline](#3-feature-engineering-pipeline)
- [4. Machine Learning Pipeline](#4-machine-learning-pipeline)
- [5. Implementation Examples](#5-implementation-examples)

## 1. Data Processing Components

### Data Cleaning Component (data_cleaner.py)
```python
from pyspark.sql import DataFrame
from pyspark.sql.functions import col, when, count, isnan, isnull, avg, stddev
from typing import List, Dict, Any

class DataCleaner:
    def __init__(self, spark_session):
        self.spark = spark_session
        
    def analyze_missing_values(self, df: DataFrame) -> Dict[str, float]:
        """Analyze missing values in each column."""
        total_count = float(df.count())
        
        missing_stats = {}
        for column in df.columns:
            missing_count = df.filter(
                col(column).isNull() | isnan(col(column))
            ).count()
            missing_stats[column] = (missing_count / total_count) * 100
            
        return missing_stats
    
    def handle_missing_values(
        self,
        df: DataFrame,
        strategies: Dict[str, str]
    ) -> DataFrame:
        """Handle missing values using specified strategies."""
        for column, strategy in strategies.items():
            if strategy == "mean":
                fill_value = df.agg(avg(col(column))).collect()[0][0]
                df = df.fillna(fill_value, subset=[column])
            elif strategy == "remove":
                df = df.dropna(subset=[column])
            elif strategy == "custom":
                # Implement custom logic here
                pass
        return df
    
    def remove_duplicates(
        self,
        df: DataFrame,
        subset: List[str] = None
    ) -> DataFrame:
        """Remove duplicate rows."""
        if subset:
            return df.dropDuplicates(subset=subset)
        return df.dropDuplicates()
    
    def standardize_formats(
        self,
        df: DataFrame,
        format_specs: Dict[str, Dict[str, Any]]
    ) -> DataFrame:
        """Standardize data formats."""
        for column, specs in format_specs.items():
            if specs["type"] == "date":
                df = df.withColumn(
                    column,
                    date_format(col(column), specs["format"])
                )
            elif specs["type"] == "string":
                df = df.withColumn(
                    column,
                    when(col(column).isNotNull(), 
                         lower(col(column)))
                    .otherwise(col(column))
                )
        return df
```

### Data Transformation Component (transformer.py)
```python
from pyspark.sql import DataFrame
from pyspark.sql.functions import col, expr, current_date
from typing import List, Dict

class DataTransformer:
    def rename_columns(
        self,
        df: DataFrame,
        mapping: Dict[str, str]
    ) -> DataFrame:
        """Rename columns based on mapping."""
        for old_name, new_name in mapping.items():
            df = df.withColumnRenamed(old_name, new_name)
        return df
    
    def filter_data(
        self,
        df: DataFrame,
        conditions: List[str]
    ) -> DataFrame:
        """Filter data based on conditions."""
        for condition in conditions:
            df = df.filter(expr(condition))
        return df
    
    def join_datasets(
        self,
        df1: DataFrame,
        df2: DataFrame,
        join_columns: List[str],
        join_type: str = "inner"
    ) -> DataFrame:
        """Join two datasets."""
        return df1.join(df2, join_columns, join_type)
    
    def aggregate_data(
        self,
        df: DataFrame,
        group_by: List[str],
        aggs: Dict[str, List[str]]
    ) -> DataFrame:
        """Aggregate data based on specifications."""
        agg_exprs = []
        for col_name, operations in aggs.items():
            for operation in operations:
                agg_exprs.append(f"{operation}({col_name})")
        
        return df.groupBy(group_by).agg(*agg_exprs)
```

### Data Enrichment Component (enricher.py)
```python
from pyspark.sql import DataFrame
from pyspark.sql.functions import col, create_map, lit
from typing import Dict, Any

class DataEnricher:
    def __init__(self, spark_session):
        self.spark = spark_session
        
    def load_external_data(
        self,
        source_type: str,
        source_path: str,
        options: Dict[str, Any] = None
    ) -> DataFrame:
        """Load external data for enrichment."""
        reader = self.spark.read.format(source_type)
        
        if options:
            for key, value in options.items():
                reader = reader.option(key, value)
                
        return reader.load(source_path)
    
    def enrich_data(
        self,
        df: DataFrame,
        enrichment_df: DataFrame,
        join_columns: List[str],
        columns_to_add: List[str]
    ) -> DataFrame:
        """Enrich main dataset with external data."""
        return df.join(
            enrichment_df.select(join_columns + columns_to_add),
            join_columns,
            "left"
        )
    
    def add_derived_features(
        self,
        df: DataFrame,
        feature_definitions: Dict[str, str]
    ) -> DataFrame:
        """Add derived features based on expressions."""
        for feature_name, expression in feature_definitions.items():
            df = df.withColumn(feature_name, expr(expression))
        return df
```

## 2. Data Quality Framework

### Data Quality Component (quality_checker.py)
```python
from pyspark.sql import DataFrame
from pyspark.sql.functions import col, count, when
from typing import Dict, List, Any

class DataQualityChecker:
    def __init__(self, spark_session):
        self.spark = spark_session
        
    def check_completeness(
        self,
        df: DataFrame,
        required_columns: List[str]
    ) -> Dict[str, float]:
        """Check data completeness."""
        results = {}
        total_rows = df.count()
        
        for column in required_columns:
            non_null_count = df.filter(
                col(column).isNotNull()
            ).count()
            results[column] = (non_null_count / total_rows) * 100
            
        return results
    
    def check_uniqueness(
        self,
        df: DataFrame,
        unique_columns: List[str]
    ) -> Dict[str, bool]:
        """Check column uniqueness."""
        results = {}
        
        for column in unique_columns:
            total_count = df.count()
            distinct_count = df.select(column).distinct().count()
            results[column] = total_count == distinct_count
            
        return results
    
    def check_value_ranges(
        self,
        df: DataFrame,
        range_specs: Dict[str, Dict[str, Any]]
    ) -> Dict[str, bool]:
        """Check if values are within specified ranges."""
        results = {}
        
        for column, specs in range_specs.items():
            invalid_count = df.filter(
                ~col(column).between(specs["min"], specs["max"])
            ).count()
            results[column] = invalid_count == 0
            
        return results
```

## 3. Feature Engineering Pipeline

### Feature Engineering Component (feature_engineer.py)
```python
from pyspark.sql import DataFrame
from pyspark.ml.feature import StandardScaler, MinMaxScaler, OneHotEncoder
from pyspark.ml.feature import StringIndexer, VectorAssembler
from pyspark.ml import Pipeline
from typing import List, Dict

class FeatureEngineer:
    def create_feature_pipeline(
        self,
        numeric_cols: List[str],
        categorical_cols: List[str],
        scaling_method: str = "standard"
    ) -> Pipeline:
        """Create a feature engineering pipeline."""
        stages = []
        
        # Handle categorical features
        string_indexers = [
            StringIndexer(
                inputCol=col,
                outputCol=f"{col}_index"
            ) for col in categorical_cols
        ]
        stages.extend(string_indexers)
        
        encoder = OneHotEncoder(
            inputCols=[f"{col}_index" for col in categorical_cols],
            outputCols=[f"{col}_vec" for col in categorical_cols]
        )
        stages.append(encoder)
        
        # Handle numeric features
        assembler = VectorAssembler(
            inputCols=numeric_cols,
            outputCol="numeric_features"
        )
        stages.append(assembler)
        
        # Scale numeric features
        if scaling_method == "standard":
            scaler = StandardScaler(
                inputCol="numeric_features",
                outputCol="scaled_numeric_features"
            )
        else:
            scaler = MinMaxScaler(
                inputCol="numeric_features",
                outputCol="scaled_numeric_features"
            )
        stages.append(scaler)
        
        # Combine all features
        final_assembler = VectorAssembler(
            inputCols=(
                [f"{col}_vec" for col in categorical_cols] +
                ["scaled_numeric_features"]
            ),
            outputCol="features"
        )
        stages.append(final_assembler)
        
        return Pipeline(stages=stages)
```

## 4. Machine Learning Pipeline

### Model Training Component (model_trainer.py)
```python
from pyspark.sql import DataFrame
from pyspark.ml import Pipeline
from pyspark.ml.classification import RandomForestClassifier
from pyspark.ml.regression import RandomForestRegressor
from pyspark.ml.evaluation import MulticlassClassificationEvaluator
from pyspark.ml.evaluation import RegressionEvaluator
from typing import Dict, Any, Tuple

class ModelTrainer:
    def __init__(self, feature_pipeline: Pipeline):
        self.feature_pipeline = feature_pipeline
        
    def train_test_split(
        self,
        df: DataFrame,
        target_col: str,
        test_size: float = 0.2,
        seed: int = 42
    ) -> Tuple[DataFrame, DataFrame]:
        """Split data into training and test sets."""
        return df.randomSplit([1 - test_size, test_size], seed=seed)
    
    def train_classifier(
        self,
        train_data: DataFrame,
        target_col: str,
        hyperparams: Dict[str, Any] = None
    ) -> Pipeline:
        """Train a classification model."""
        if not hyperparams:
            hyperparams = {
                "numTrees": 100,
                "maxDepth": 5,
                "seed": 42
            }
            
        classifier = RandomForestClassifier(
            labelCol=target_col,
            featuresCol="features",
            **hyperparams
        )
        
        pipeline = Pipeline(
            stages=[self.feature_pipeline, classifier]
        )
        
        return pipeline.fit(train_data)
    
    def evaluate_model(
        self,
        model: Pipeline,
        test_data: DataFrame,
        target_col: str,
        task_type: str = "classification"
    ) -> Dict[str, float]:
        """Evaluate model performance."""
        predictions = model.transform(test_data)
        
        if task_type == "classification":
            evaluator = MulticlassClassificationEvaluator(
                labelCol=target_col,
                predictionCol="prediction"
            )
            
            metrics = {}
            for metric in ["accuracy", "f1", "precision", "recall"]:
                evaluator.setMetricName(metric)
                metrics[metric] = evaluator.evaluate(predictions)
                
        else:  # regression
            evaluator = RegressionEvaluator(
                labelCol=target_col,
                predictionCol="prediction"
            )
            
            metrics = {}
            for metric in ["rmse", "mae", "r2"]:
                evaluator.setMetricName(metric)
                metrics[metric] = evaluator.evaluate(predictions)
                
        return metrics
```

## 5. Implementation Examples

### Example Usage Script (main.py)
```python
from pyspark.sql import SparkSession
from data_cleaner import DataCleaner
from transformer import DataTransformer
from enricher import DataEnricher
from quality_checker import DataQualityChecker
from feature_engineer import FeatureEngineer
from model_trainer import ModelTrainer

def main():
    # Initialize Spark session
    spark = SparkSession.builder \
        .appName("CustomerAnalytics") \
        .getOrCreate()
    
    # Load data
    customer_df = spark.read.parquet("customer_data.parquet")
    
    # Initialize components
    cleaner = DataCleaner(spark)
    transformer = DataTransformer()
    enricher = DataEnricher(spark)
    quality_checker = DataQualityChecker(spark)
    
    # Clean data
    missing_strategies = {
        "age": "mean",
        "income": "mean",
        "occupation": "remove"
    }
    cleaned_df = cleaner.handle_missing_values(
        customer_df,
        missing_strategies
    )
    
    # Transform data
    transformed_df = transformer.filter_data(
        cleaned_df,
        ["age >= 18", "income > 0"]
    )
    
    # Check data quality
    quality_results = quality_checker.check_completeness(
        transformed_df,
        ["customer_id", "age", "income"]
    )
    
    # Feature engineering
    feature_engineer = FeatureEngineer()
    feature_pipeline = feature_engineer.create_feature_pipeline(
        numeric_cols=["age", "income"],
        categorical_cols=["occupation", "education"]
    )
    
    # Train model
    trainer = ModelTrainer(feature_pipeline)
    train_df, test_df = trainer.train_test_split(
        transformed_df,
        "churn"
    )
    
    model = trainer.train_classifier(
        train_df,
        "churn"
    )
    
    # Evaluate model
    metrics = trainer.evaluate_model(
        model,
        test_df,
        "churn"
    )
    
    print("Model Performance:", metrics)
    
if __name__ == "__main__":
    main()
```

### Configuration File (config.yaml)
```yaml
data_processing:
  missing_value_strategies:
    numeric:
      default: mean
      custom:
        age: median
        income: mean
    categorical:
      default: mode
      custom:
        occupation: remove
  
  data_quality:
    completeness_threshold: 95.0
    uniqueness_checks:
      - customer_id
      - email
    range_checks:
      age:
        min: 18
        max: 120
      income:
        min: 0
        max: 1000000

feature_engineering:
  
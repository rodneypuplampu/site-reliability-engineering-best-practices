import json
import boto3
import time
import os
from typing import Dict, Any, Tuple
from datetime import datetime

class ConnectRAGHandler:
    def __init__(self):
        self.sagemaker_runtime = boto3.client('runtime.sagemaker')
        self.cloudwatch = boto3.client('cloudwatch')
        self.endpoint_name = os.environ['SAGEMAKER_ENDPOINT']
        self.confidence_threshold = float(os.environ.get('CONFIDENCE_THRESHOLD', '0.7'))
        self.max_retries = int(os.environ.get('MAX_RETRIES', '3'))

    def clean_text(self, text: str) -> str:
        """Clean and normalize input text."""
        text = text.strip().lower()
        # Add additional text cleaning logic as needed
        return text

    def detect_channel(self, event: Dict[str, Any]) -> str:
        """Detect if the input is from voice or chat."""
        if 'ContactData' in event:
            return event['ContactData'].get('Channel', 'UNKNOWN')
        return 'UNKNOWN'

    def extract_metadata(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Extract relevant metadata from the Connect event."""
        return {
            'contact_id': event.get('ContactId'),
            'channel': self.detect_channel(event),
            'timestamp': datetime.now().isoformat(),
            'customer_id': event.get('CustomerData', {}).get('CustomerId')
        }

    def invoke_rag_system(self, query: str, metadata: Dict[str, Any]) -> Tuple[Dict[str, Any], float]:
        """Invoke the RAG system through SageMaker endpoint."""
        for attempt in range(self.max_retries):
            try:
                start_time = time.time()
                
                # Prepare the payload for the RAG system
                payload = {
                    'query': query,
                    'metadata': metadata,
                    'parameters': {
                        'max_length': 100,
                        'temperature': 0.7,
                        'top_k': 50
                    }
                }

                # Invoke SageMaker endpoint
                response = self.sagemaker_runtime.invoke_endpoint(
                    EndpointName=self.endpoint_name,
                    ContentType='application/json',
                    Body=json.dumps(payload)
                )

                # Process response
                response_body = json.loads(response['Body'].read().decode())
                
                # Calculate and log latency
                latency = time.time() - start_time
                self.log_metrics('RAGLatency', latency)

                # Extract confidence score
                confidence = response_body.get('confidence', 0.0)
                
                return response_body, confidence

            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise Exception(f"Failed to invoke RAG system after {self.max_retries} attempts: {str(e)}")
                time.sleep(2 ** attempt)  # Exponential backoff

    def determine_routing(self, confidence: float) -> str:
        """Determine routing based on confidence score."""
        if confidence >= self.confidence_threshold:
            return 'SELF_SERVICE'
        elif confidence >= self.confidence_threshold * 0.7:
            return 'AGENT_QUEUE'
        return 'FALLBACK'

    def log_metrics(self, metric_name: str, value: float):
        """Log metrics to CloudWatch."""
        try:
            self.cloudwatch.put_metric_data(
                Namespace='Connect/RAG',
                MetricData=[{
                    'MetricName': metric_name,
                    'Value': value,
                    'Unit': 'None',
                    'Timestamp': datetime.now()
                }]
            )
        except Exception as e:
            print(f"Failed to log metrics: {str(e)}")

    def handle_request(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Main handler for processing Connect requests."""
        try:
            # Extract and clean input
            input_text = event.get('InputText', '')
            cleaned_text = self.clean_text(input_text)
            
            # Extract metadata
            metadata = self.extract_metadata(event)
            
            # Invoke RAG system
            response, confidence = self.invoke_rag_system(cleaned_text, metadata)
            
            # Determine routing
            routing = self.determine_routing(confidence)
            
            # Prepare response
            result = {
                'statusCode': 200,
                'body': {
                    'response': response.get('response', ''),
                    'confidence': confidence,
                    'routing': routing,
                    'metadata': metadata
                }
            }
            
            # Log outcome
            self.log_metrics('QueryConfidence', confidence)
            self.log_metrics('SuccessfulQuery', 1)
            
            return result

        except Exception as e:
            self.log_metrics('FailedQuery', 1)
            return {
                'statusCode': 500,
                'body': {
                    'error': str(e),
                    'routing': 'FALLBACK'
                }
            }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """AWS Lambda entry point."""
    handler = ConnectRAGHandler()
    return handler.handle_request(event)

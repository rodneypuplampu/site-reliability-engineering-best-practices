# Amazon Connect Configuration Export Guide

This guide provides a step-by-step process for exporting Amazon Connect instance configurations, specifically contact flows, to redeploy to another Amazon Connect instance.

## Prerequisites

- AWS CLI installed and configured with appropriate permissions
- Python 3.x installed
- Required Python packages: boto3, json, os, datetime
- AWS IAM permissions for Amazon Connect API actions

## Step 1: Install Required Dependencies

```bash
pip install boto3
```

## Step 2: Create the Export Script

Create a file named `export_connect_flows.py` with the following content:

```python
import boto3
import json
import os
import datetime
from botocore.exceptions import ClientError

def create_directory(directory_path):
    """Create directory if it doesn't exist"""
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
        print(f"Created directory: {directory_path}")

def export_contact_flows(source_instance_id, output_dir="exported_flows"):
    """Export all contact flows from an Amazon Connect instance"""
    connect_client = boto3.client('connect')
    
    # Create timestamp for the export
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    export_dir = f"{output_dir}/{timestamp}"
    create_directory(export_dir)
    
    # Create a metadata file to track the export
    metadata = {
        "source_instance_id": source_instance_id,
        "export_timestamp": timestamp,
        "flows": []
    }
    
    try:
        # List all contact flows in the instance
        print(f"Listing contact flows for instance {source_instance_id}...")
        paginator = connect_client.get_paginator('list_contact_flows')
        flow_count = 0
        
        for page in paginator.paginate(InstanceId=source_instance_id):
            for flow in page['ContactFlowSummaryList']:
                flow_id = flow['Id']
                flow_arn = flow['Arn']
                flow_name = flow['Name']
                flow_type = flow['Type']
                
                print(f"Exporting flow: {flow_name} ({flow_id})")
                
                try:
                    # Get the contact flow content
                    flow_response = connect_client.describe_contact_flow(
                        InstanceId=source_instance_id,
                        ContactFlowId=flow_id
                    )
                    
                    flow_content = flow_response['ContactFlow']
                    
                    # Save the flow content to a JSON file
                    sanitized_name = flow_name.replace('/', '_').replace(' ', '_')
                    filename = f"{sanitized_name}_{flow_id}.json"
                    file_path = f"{export_dir}/{filename}"
                    
                    with open(file_path, 'w') as f:
                        json.dump(flow_content, f, indent=2)
                    
                    # Add flow information to metadata
                    metadata['flows'].append({
                        "id": flow_id,
                        "name": flow_name,
                        "type": flow_type,
                        "arn": flow_arn,
                        "file": filename
                    })
                    
                    flow_count += 1
                    
                except ClientError as e:
                    print(f"Error exporting flow {flow_name}: {e}")
        
        # Save metadata
        with open(f"{export_dir}/metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\nExport completed. {flow_count} flows exported to {export_dir}")
        return export_dir
        
    except ClientError as e:
        print(f"Error accessing Amazon Connect instance: {e}")
        return None

def export_phone_number_mappings(source_instance_id, export_dir):
    """Export phone number to contact flow mappings"""
    connect_client = boto3.client('connect')
    
    try:
        print("Exporting phone number mappings...")
        mappings = []
        
        # List all phone numbers in the instance
        paginator = connect_client.get_paginator('list_phone_numbers')
        
        for page in paginator.paginate(InstanceId=source_instance_id):
            for phone_number in page['PhoneNumberSummaryList']:
                phone_number_id = phone_number['Id']
                
                # Get the details for each phone number
                phone_details = connect_client.describe_phone_number(
                    PhoneNumberId=phone_number_id
                )
                
                # If the phone number is associated with a contact flow, record the mapping
                if 'ContactFlowId' in phone_details['PhoneNumber'] and phone_details['PhoneNumber']['ContactFlowId']:
                    mappings.append({
                        "phone_number_id": phone_number_id,
                        "phone_number": phone_details['PhoneNumber']['PhoneNumber'],
                        "contact_flow_id": phone_details['PhoneNumber']['ContactFlowId']
                    })
        
        # Save the mappings to a file
        with open(f"{export_dir}/phone_number_mappings.json", 'w') as f:
            json.dump(mappings, f, indent=2)
        
        print(f"Exported {len(mappings)} phone number mappings")
        
    except ClientError as e:
        print(f"Error exporting phone number mappings: {e}")

def main():
    # Get source instance ID from user
    source_instance_id = input("Enter the Amazon Connect instance ID to export: ")
    
    # Export all contact flows
    export_dir = export_contact_flows(source_instance_id)
    
    if export_dir:
        # Export phone number to contact flow mappings
        export_phone_number_mappings(source_instance_id, export_dir)
        
        print("\nExport process completed successfully.")
        print(f"All exported files are available in the {export_dir} directory.")
        print("\nTo import these flows to another instance, use the import_connect_flows.py script.")

if __name__ == "__main__":
    main()
```

## Step 3: Create the Import Script

Create a file named `import_connect_flows.py` with the following content:

```python
import boto3
import json
import os
import time
from botocore.exceptions import ClientError

def import_contact_flows(target_instance_id, export_dir):
    """Import contact flows to a target Amazon Connect instance"""
    connect_client = boto3.client('connect')
    
    # Load metadata
    try:
        with open(f"{export_dir}/metadata.json", 'r') as f:
            metadata = json.load(f)
    except FileNotFoundError:
        print(f"Error: metadata.json not found in {export_dir}")
        return False
    
    # Create a mapping of original flow IDs to new flow IDs
    flow_id_mapping = {}
    import_count = 0
    
    print(f"Importing flows to instance {target_instance_id}...")
    
    # First pass: Import all flows
    for flow_info in metadata['flows']:
        flow_name = flow_info['name']
        flow_type = flow_info['type']
        filename = flow_info['file']
        original_id = flow_info['id']
        
        try:
            # Load flow content
            with open(f"{export_dir}/{filename}", 'r') as f:
                flow_content = json.load(f)
            
            # Extract the flow content string
            flow_content_str = flow_content['Content']
            
            print(f"Importing flow: {flow_name}")
            
            # Create the contact flow in the target instance
            response = connect_client.create_contact_flow(
                InstanceId=target_instance_id,
                Name=flow_name,
                Type=flow_type,
                Content=flow_content_str
            )
            
            # Store the mapping from original ID to new ID
            new_id = response['ContactFlowId']
            flow_id_mapping[original_id] = new_id
            
            print(f"  Imported as: {new_id}")
            import_count += 1
            
            # Throttle requests to avoid hitting API limits
            time.sleep(0.5)
            
        except ClientError as e:
            print(f"Error importing flow {flow_name}: {e}")
        except FileNotFoundError:
            print(f"Error: Flow file {filename} not found in {export_dir}")
    
    # Save the ID mapping for future reference
    with open(f"{export_dir}/id_mapping.json", 'w') as f:
        json.dump(flow_id_mapping, f, indent=2)
    
    print(f"\nImport completed. {import_count} flows imported to {target_instance_id}")
    return True

def import_phone_number_mappings(target_instance_id, export_dir):
    """Import phone number to contact flow mappings"""
    connect_client = boto3.client('connect')
    
    # Load phone number mappings
    try:
        with open(f"{export_dir}/phone_number_mappings.json", 'r') as f:
            mappings = json.load(f)
    except FileNotFoundError:
        print(f"Error: phone_number_mappings.json not found in {export_dir}")
        return
    
    # Load ID mapping
    try:
        with open(f"{export_dir}/id_mapping.json", 'r') as f:
            id_mapping = json.load(f)
    except FileNotFoundError:
        print(f"Error: id_mapping.json not found in {export_dir}")
        return
    
    print("Importing phone number mappings...")
    success_count = 0
    
    # List all phone numbers in the target instance to find matching ones
    try:
        paginator = connect_client.get_paginator('list_phone_numbers')
        target_numbers = {}
        
        for page in paginator.paginate(InstanceId=target_instance_id):
            for phone_number in page['PhoneNumberSummaryList']:
                phone_details = connect_client.describe_phone_number(
                    PhoneNumberId=phone_number['Id']
                )
                target_numbers[phone_details['PhoneNumber']['PhoneNumber']] = phone_number['Id']
        
        # Associate flows with phone numbers
        for mapping in mappings:
            phone_number = mapping['phone_number']
            original_flow_id = mapping['contact_flow_id']
            
            # Skip if we don't have this phone number in the target instance
            if phone_number not in target_numbers:
                print(f"  Phone number {phone_number} not found in target instance - skipping")
                continue
            
            # Skip if we don't have the flow ID mapping
            if original_flow_id not in id_mapping:
                print(f"  Flow ID {original_flow_id} not found in ID mapping - skipping")
                continue
            
            target_phone_id = target_numbers[phone_number]
            target_flow_id = id_mapping[original_flow_id]
            
            try:
                # Associate the phone number with the contact flow
                connect_client.associate_phone_number_contact_flow(
                    InstanceId=target_instance_id,
                    PhoneNumberId=target_phone_id,
                    ContactFlowId=target_flow_id
                )
                
                print(f"  Associated {phone_number} with flow ID {target_flow_id}")
                success_count += 1
                
                # Throttle requests
                time.sleep(0.5)
                
            except ClientError as e:
                print(f"  Error associating {phone_number}: {e}")
        
        print(f"Imported {success_count} of {len(mappings)} phone number mappings")
        
    except ClientError as e:
        print(f"Error importing phone number mappings: {e}")

def main():
    # Get target instance ID from user
    target_instance_id = input("Enter the target Amazon Connect instance ID: ")
    
    # Get export directory path from user
    export_dir = input("Enter the path to the exported flows directory: ")
    
    if not os.path.exists(export_dir):
        print(f"Error: Directory {export_dir} not found")
        return
    
    # Import all contact flows
    if import_contact_flows(target_instance_id, export_dir):
        # Import phone number to contact flow mappings
        import_phone_number_mappings(target_instance_id, export_dir)
        
        print("\nImport process completed.")
        print("Note: You may need to manually review and update any Lambda functions, Lex bots, or other integrations.")

if __name__ == "__main__":
    main()
```

## Step 4: Create a Script for Global Resiliency Replication

For users leveraging Amazon Connect Global Resiliency, create a file named `replicate_connect_instance.py`:

```python
import boto3
import time
from botocore.exceptions import ClientError

def replicate_connect_instance(source_instance_id, replica_region):
    """Create a replica of an Amazon Connect instance in another region"""
    connect_client = boto3.client('connect')
    
    try:
        print(f"Initiating replication of instance {source_instance_id} to region {replica_region}...")
        
        # Start the replication process
        response = connect_client.replicate_instance(
            SourceInstanceId=source_instance_id,
            ReplicaRegion=replica_region
        )
        
        replica_instance_id = response['ReplicaInstanceId']
        print(f"Replication initiated. Replica instance ID: {replica_instance_id}")
        
        # Wait for replication to complete
        print("Waiting for replication to complete (this may take some time)...")
        
        replica_connect_client = boto3.client('connect', region_name=replica_region)
        
        # Check replication status every 30 seconds for up to 30 minutes
        for _ in range(60):
            try:
                instance_info = replica_connect_client.describe_instance(
                    InstanceId=replica_instance_id
                )
                
                status = instance_info['Instance']['Status']
                print(f"Current status: {status}")
                
                if status == 'ACTIVE':
                    print(f"Replication completed successfully!")
                    print(f"Replica instance {replica_instance_id} is now active in region {replica_region}")
                    return replica_instance_id
                
                # If still in progress, wait and check again
                time.sleep(30)
                
            except ClientError as e:
                if 'ResourceNotFoundException' in str(e):
                    print("Replica instance not yet available, waiting...")
                    time.sleep(30)
                else:
                    raise e
        
        print("Replication is still in progress after waiting 30 minutes.")
        print(f"You can check the status manually in the AWS Console or using the AWS CLI.")
        print(f"Replica instance ID: {replica_instance_id} in region {replica_region}")
        
        return replica_instance_id
        
    except ClientError as e:
        print(f"Error replicating instance: {e}")
        return None

def main():
    # Get source instance ID from user
    source_instance_id = input("Enter the Amazon Connect instance ID to replicate: ")
    
    # Get target region from user
    replica_region = input("Enter the target AWS region for replication (e.g., us-west-2): ")
    
    # Replicate the instance
    replica_instance_id = replicate_connect_instance(source_instance_id, replica_region)
    
    if replica_instance_id:
        print("\nImportant Notes:")
        print("1. The ReplicateInstance API automatically synchronizes contact flows, queues, quick connects, and other resources.")
        print("2. Lambda functions, Amazon Lex bots, and other third-party integrations are NOT synchronized.")
        print("3. You will need to manually set up these integrations in the target region.")
        print("4. After replication, changes to either the original or replica resources will be synchronized bidirectionally.")

if __name__ == "__main__":
    main()
```

## Step 5: Running the Scripts

### To Export Contact Flows

1. Open a terminal or command prompt
2. Navigate to the directory containing the scripts
3. Run the export script:

```bash
python export_connect_flows.py
```

4. Enter your Amazon Connect instance ID when prompted
5. The script will create a directory with the current timestamp containing all exported flows

### To Import Contact Flows to Another Instance

1. Run the import script:

```bash
python import_connect_flows.py
```

2. Enter the target Amazon Connect instance ID when prompted
3. Enter the path to the exported flows directory when prompted
4. The script will import all flows and create the necessary mappings

### For Global Resiliency Replication

1. Run the replication script:

```bash
python replicate_connect_instance.py
```

2. Enter your source Amazon Connect instance ID when prompted
3. Enter the target AWS region for replication when prompted
4. The script will initiate the replication process and monitor its status

## Important Considerations

1. **Service Quotas**: Be mindful that service quotas are specific to each instance.
2. **User Directory**: Some supporting services, such as the User Directory, can be linked to only one Amazon Connect instance at a time.
3. **Third-party integrations**: The ReplicateInstance API does not synchronize Lambda functions, Amazon Lex bots, or other third-party integrations.
4. **Legacy Flows**: Flows must be in the new flow language to be properly exported and imported. Legacy flows should be converted in the flow designer user interface before export.
5. **Check Call Progress**: For outbound calls, if reattempts, call classification, or waiting for a prompt is desired, the Flow must contain a Check call progress block.
6. **API Throttling**: The scripts include sleep periods to avoid hitting API rate limits, but you may need to adjust these for large instances.
7. **Error Handling**: The scripts include basic error handling, but you may want to enhance this for production use.

## Troubleshooting

1. **API Permissions**: Ensure your AWS credentials have the necessary permissions for Amazon Connect APIs.
2. **Legacy Flows**: If import fails for some flows, check if they are legacy flows that need conversion.
3. **Resource Limits**: If you hit service quotas during import, you may need to request quota increases.
4. **Missing Integrations**: After import, manually verify and update any Lambda function, Lex bot, or other integration references.
5. **Flow Dependencies**: Some flows may depend on others - you might need to run the import script multiple times to resolve all dependencies.

## Additional Resources

1. [Amazon Connect API Reference](https://docs.aws.amazon.com/connect/latest/APIReference/welcome.html)
2. [Amazon Connect Global Resiliency Guide](https://docs.aws.amazon.com/connect/latest/adminguide/setup-connect-global-resiliency.html)
3. [Amazon Connect Flow Language Reference](https://docs.aws.amazon.com/connect/latest/adminguide/flow-language.html)

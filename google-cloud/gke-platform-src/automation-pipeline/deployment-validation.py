#!/usr/bin/env python3
"""
deployment_validation.py
Validates deployment configuration for GKE infrastructure
"""

import argparse
import os
import sys
import json
import yaml
import subprocess
from pathlib import Path


def check_helm_chart_consistency():
    """Checks if Helm chart values are consistent across environments"""
    print("Checking Helm chart consistency...")
    
    environments = ["dev", "prod"]
    charts = ["gke-cluster", "security", "apis"]
    
    for chart in charts:
        required_values = set()
        
        # First pass: collect all required values from templates
        chart_dir = Path(f"./helm/charts/{chart}/templates")
        for template_file in chart_dir.glob("*.yaml"):
            with open(template_file, "r") as f:
                template_content = f.read()
                
            # Simple regex-like scan for required values
            # This is a simplification - in real world you'd use a proper YAML parser
            value_refs = [line.strip().split("}}")[0].split(".")[-1] 
                          for line in template_content.split("{{") 
                          if "." in line and "}}" in line]
            
            for value in value_refs:
                if value not in ["if", "else", "end"]:  # Skip control structures
                    required_values.add(value)
        
        # Second pass: ensure all environments have the required values
        for env in environments:
            env_values_file = Path(f"./helm/environments/{env}/values.yaml")
            
            with open(env_values_file, "r") as f:
                env_values = yaml.safe_load(f)
            
            flat_values = flatten_dict(env_values)
            
            for required_value in required_values:
                if required_value not in flat_values:
                    print(f"WARNING: Value '{required_value}' required by chart '{chart}' is missing in {env} environment")
    
    return True


def check_terraform_variable_consistency():
    """Checks if Terraform variables are consistent across environments"""
    print("Checking Terraform variable consistency...")
    
    environments = ["dev", "prod"]
    required_vars = set()
    
    # First collect all variables from modules
    modules_dir = Path("./terraform/modules")
    for module in modules_dir.glob("*"):
        vars_file = module / "variables.tf"
        if vars_file.exists():
            try:
                # Parse variables.tf to extract variable names
                result = subprocess.run(
                    ["terraform", "providers", "schema", "-json"],
                    cwd=module,
                    capture_output=True,
                    text=True,
                )
                if result.returncode == 0:
                    schema = json.loads(result.stdout)
                    for var in schema.get("variables", []):
                        required_vars.add(var)
            except Exception as e:
                print(f"Warning: Could not parse variables in {module}: {e}")
    
    # Now check if each environment defines these variables
    for env in environments:
        env_dir = Path(f"./terraform/environments/{env}")
        tfvars_file = env_dir / "terraform.tfvars"
        
        if not tfvars_file.exists():
            print(f"WARNING: No terraform.tfvars file found for {env} environment")
            continue
        
        # Parse tfvars file
        try:
            result = subprocess.run(
                ["terraform", "console", "-var-file=terraform.tfvars", "-json"],
                input="jsonencode(var)",
                cwd=env_dir,
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                defined_vars = json.loads(result.stdout)
                
                for required_var in required_vars:
                    if required_var not in defined_vars:
                        print(f"WARNING: Variable '{required_var}' is not defined in {env} environment")
        except Exception as e:
            print(f"Warning: Could not parse tfvars in {env_dir}: {e}")
    
    return True


def check_cluster_requirements():
    """Checks if GKE cluster requirements are met"""
    print("Checking GKE cluster requirements...")
    
    # Check cluster configuration
    try:
        with open("./helm/charts/gke-cluster/values.yaml", "r") as f:
            values = yaml.safe_load(f)
        
        # Check for private cluster configuration
        if not values.get("privateCluster", {}).get("enabled", False):
            print("WARNING: Private cluster is not enabled")
        
        # Check for workload identity
        if not values.get("workloadIdentity", {}).get("enabled", False):
            print("WARNING: Workload identity is not enabled")
        
        # Check for network policy
        if not values.get("networkPolicy", {}).get("enabled", False):
            print("WARNING: Network policy is not enabled")
        
        # Check for node auto-upgrade
        for pool in values.get("nodePools", []):
            if not pool.get("management", {}).get("autoUpgrade", False):
                print(f"WARNING: Node pool {pool.get('name')} has auto-upgrade disabled")
        
    except Exception as e:
        print(f"Error checking cluster requirements: {e}")
        return False
    
    return True


def check_security_requirements():
    """Checks if security requirements are met"""
    print("Checking security requirements...")
    
    # Check security configuration
    try:
        with open("./helm/charts/security/values.yaml", "r") as f:
            values = yaml.safe_load(f)
        
        # Check for PSP (Pod Security Policy)
        if not values.get("podSecurityPolicy", {}).get("enabled", False):
            print("WARNING: Pod Security Policy is not enabled")
        
        # Check for RBAC
        if not values.get("rbac", {}).get("enabled", True):
            print("ERROR: RBAC is disabled")
            return False
        
        # Check for network policies
        if not values.get("networkPolicies", {}).get("enabled", False):
            print("WARNING: Network policies are not enabled in security chart")
        
    except Exception as e:
        print(f"Error checking security requirements: {e}")
        return False
    
    return True


def flatten_dict(d, parent_key='', sep='.'):
    """Flattens a nested dictionary"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Validate deployment configuration')
    parser.add_argument('--environment', choices=['dev', 'prod'], help='Environment to validate')
    args = parser.parse_args()
    
    # Run all checks
    checks = [
        check_helm_chart_consistency,
        check_terraform_variable_consistency,
        check_cluster_requirements,
        check_security_requirements,
    ]
    
    success = True
    for check in checks:
        if not check():
            success = False
    
    if not success:
        print("Validation failed!")
        sys.exit(1)
    
    print("All validation checks passed!")
    return 0


if __name__ == "__main__":
    sys.exit(main())

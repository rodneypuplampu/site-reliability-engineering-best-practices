#!/bin/bash
# validate_helm.sh
# Validates all Helm charts in the project

set -e

echo "Validating Helm charts..."

# Check for helm binary
if ! command -v helm &> /dev/null; then
    echo "Helm is not installed or not in PATH"
    exit 1
fi

# Lint all charts
find ./helm/charts -name "Chart.yaml" -exec dirname {} \; | while read chart_dir; do
    echo "Linting chart: $chart_dir"
    helm lint "$chart_dir"
    
    # Validate the chart with yamllint
    echo "Validating YAML in chart: $chart_dir"
    find "$chart_dir" -name "*.yaml" -o -name "*.yml" | xargs yamllint -c .yamllint.yml
    
    # Template the chart to validate the output
    echo "Templating chart: $chart_dir"
    helm template "$chart_dir" > /dev/null
done

# Validate environment values
for env in dev prod; do
    echo "Validating $env environment values"
    for chart in gke-cluster security apis; do
        helm template "./helm/charts/$chart" -f "./helm/environments/$env/values.yaml" > /dev/null
    done
done

echo "All Helm charts validated successfully!"

# Exit with success
exit 0

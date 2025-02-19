# Container Build and Upload Automation

A Bash script for automating the build and upload of container images to artifact registries.

## build_and_upload.sh

```bash
#!/bin/bash

# Exit on error
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script version
VERSION="1.0.0"

# Default values
DEFAULT_DOCKERFILE_PATH="."
DEFAULT_TAG="latest"
DEFAULT_LOCAL_REPO_DIR="temp_repo"

# Function to display usage information
usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -r, --repo-url         Git repository URL (required)"
    echo "  -i, --image-name       Image name (required)"
    echo "  -g, --registry         Registry URL (required)"
    echo "  -t, --tag              Image tag (default: latest)"
    echo "  -d, --dockerfile-path  Path to Dockerfile in repo (default: .)"
    echo "  -b, --branch           Git branch to use (default: main)"
    echo "  -c, --credentials      Path to credentials file"
    echo "  -k, --keyfile          Path to registry keyfile"
    echo "  -n, --no-cleanup       Don't cleanup temporary files"
    echo "  -h, --help             Display this help message"
    echo "  -v, --version          Display script version"
    exit 1
}

# Function to log messages
log() {
    local level=$1
    shift
    local message=$@
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac
}

# Function to check required commands
check_requirements() {
    local requirements=("docker" "git")
    
    for cmd in "${requirements[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log "ERROR" "$cmd is required but not installed."
            exit 1
        fi
    done
}

# Function to authenticate with registry
authenticate_registry() {
    if [ ! -z "$CREDENTIALS_FILE" ]; then
        if [ ! -f "$CREDENTIALS_FILE" ]; then
            log "ERROR" "Credentials file not found: $CREDENTIALS_FILE"
            exit 1
        fi
        source "$CREDENTIALS_FILE"
    fi

    if [ ! -z "$KEYFILE" ]; then
        if [ ! -f "$KEYFILE" ]; then
            log "ERROR" "Keyfile not found: $KEYFILE"
            exit 1
        fi
        
        # Handle different registry authentication methods
        if [[ "$REGISTRY_URL" == *"gcr.io"* ]]; then
            gcloud auth activate-service-account --key-file="$KEYFILE"
            gcloud auth configure-docker "$REGISTRY_URL" -q
        elif [[ "$REGISTRY_URL" == *"amazonaws"* ]]; then
            aws ecr get-login-password --region "${AWS_REGION:-us-east-1}" | \
                docker login --username AWS --password-stdin "$REGISTRY_URL"
        else
            log "ERROR" "Unsupported registry type for keyfile authentication"
            exit 1
        fi
    elif [ ! -z "$DOCKER_USERNAME" ] && [ ! -z "$DOCKER_PASSWORD" ]; then
        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin "$REGISTRY_URL"
    else
        log "WARN" "No authentication credentials provided. Assuming registry is public or already authenticated."
    fi
}

# Function to clone repository
clone_repository() {
    if [ -d "$LOCAL_REPO_DIR" ]; then
        log "INFO" "Cleaning up existing repository directory"
        rm -rf "$LOCAL_REPO_DIR"
    fi
    
    log "INFO" "Cloning repository: $REPO_URL"
    git clone -b "$BRANCH" "$REPO_URL" "$LOCAL_REPO_DIR"
    
    if [ ! -d "$LOCAL_REPO_DIR/$DOCKERFILE_PATH" ]; then
        log "ERROR" "Dockerfile path not found: $DOCKERFILE_PATH"
        exit 1
    fi
}

# Function to build image
build_image() {
    local full_tag="$REGISTRY_URL/$IMAGE_NAME:$TAG"
    local build_args=""
    
    # Add build timestamp
    build_args="--build-arg BUILD_TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    
    # Add Git commit information
    if [ -d "$LOCAL_REPO_DIR/.git" ]; then
        cd "$LOCAL_REPO_DIR"
        local git_commit=$(git rev-parse HEAD)
        local git_branch=$(git rev-parse --abbrev-ref HEAD)
        build_args="$build_args --build-arg GIT_COMMIT=$git_commit --build-arg GIT_BRANCH=$git_branch"
    fi
    
    log "INFO" "Building image: $full_tag"
    docker build $build_args -t "$full_tag" "$LOCAL_REPO_DIR/$DOCKERFILE_PATH"
    
    # Create additional tags if needed
    if [ "$TAG" != "latest" ]; then
        log "INFO" "Creating latest tag"
        docker tag "$full_tag" "$REGISTRY_URL/$IMAGE_NAME:latest"
    fi
}

# Function to push image
push_image() {
    local full_tag="$REGISTRY_URL/$IMAGE_NAME:$TAG"
    
    log "INFO" "Pushing image: $full_tag"
    docker push "$full_tag"
    
    if [ "$TAG" != "latest" ]; then
        log "INFO" "Pushing latest tag"
        docker push "$REGISTRY_URL/$IMAGE_NAME:latest"
    fi
}

# Function to cleanup
cleanup() {
    if [ "$NO_CLEANUP" != "true" ]; then
        log "INFO" "Cleaning up temporary files"
        rm -rf "$LOCAL_REPO_DIR"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -r|--repo-url)
            REPO_URL="$2"
            shift
            shift
            ;;
        -i|--image-name)
            IMAGE_NAME="$2"
            shift
            shift
            ;;
        -g|--registry)
            REGISTRY_URL="$2"
            shift
            shift
            ;;
        -t|--tag)
            TAG="$2"
            shift
            shift
            ;;
        -d|--dockerfile-path)
            DOCKERFILE_PATH="$2"
            shift
            shift
            ;;
        -b|--branch)
            BRANCH="$2"
            shift
            shift
            ;;
        -c|--credentials)
            CREDENTIALS_FILE="$2"
            shift
            shift
            ;;
        -k|--keyfile)
            KEYFILE="$2"
            shift
            shift
            ;;
        -n|--no-cleanup)
            NO_CLEANUP="true"
            shift
            ;;
        -h|--help)
            usage
            ;;
        -v|--version)
            echo "Version: $VERSION"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $key"
            usage
            ;;
    esac
done

# Verify required arguments
if [ -z "$REPO_URL" ] || [ -z "$IMAGE_NAME" ] || [ -z "$REGISTRY_URL" ]; then
    log "ERROR" "Missing required arguments"
    usage
fi

# Set defaults for optional arguments
TAG=${TAG:-$DEFAULT_TAG}
DOCKERFILE_PATH=${DOCKERFILE_PATH:-$DEFAULT_DOCKERFILE_PATH}
BRANCH=${BRANCH:-"main"}
LOCAL_REPO_DIR=${LOCAL_REPO_DIR:-$DEFAULT_LOCAL_REPO_DIR}

# Main execution
main() {
    log "INFO" "Starting container build and upload process"
    
    # Check requirements
    check_requirements
    
    # Authenticate with registry
    authenticate_registry
    
    # Clone repository
    clone_repository
    
    # Build image
    build_image
    
    # Push image
    push_image
    
    # Cleanup
    cleanup
    
    log "INFO" "Process completed successfully"
}

# Run main function
main
```

## Usage

1. Make the script executable:
```bash
chmod +x build_and_upload.sh
```

2. Basic usage:
```bash
./build_and_upload.sh \
    --repo-url https://github.com/username/repo.git \
    --image-name myapp \
    --registry docker.io/username
```

3. Advanced usage with all options:
```bash
./build_and_upload.sh \
    --repo-url https://github.com/username/repo.git \
    --image-name myapp \
    --registry docker.io/username \
    --tag v1.0.0 \
    --dockerfile-path src/docker \
    --branch develop \
    --credentials creds.env \
    --keyfile service-account.json \
    --no-cleanup
```

## Credentials File Format (creds.env)

```bash
DOCKER_USERNAME=your_username
DOCKER_PASSWORD=your_password
AWS_REGION=us-east-1  # Optional, for AWS ECR
```

## Supported Registry Types

- Docker Hub
- Google Container Registry (GCR)
- AWS Elastic Container Registry (ECR)
- Azure Container Registry (ACR)
- Generic private registries

## Features

- Automatic authentication with various registry types
- Support for custom Dockerfile paths
- Git branch selection
- Build argument injection (timestamp, Git commit)
- Multiple tagging support
- Cleanup management
- Comprehensive error handling
- Colorized output
- Registry-specific authentication methods

## Error Handling

The script includes error handling for:
- Missing required commands
- Invalid repository URLs
- Missing Dockerfile
- Registry authentication failures
- Build failures
- Push failures

## Security Considerations

1. Credential Management:
   - Use credential files or environment variables
   - Support for service account keys
   - Automatic cleanup of sensitive files

2. Authentication:
   - Support for various authentication methods
   - Secure password handling
   - Registry-specific authentication flows

## Customization

You can customize the script by:
1. Modifying the default values at the top of the script
2. Adding additional build arguments
3. Implementing custom authentication methods
4. Adding pre/post build hooks
5. Extending cleanup procedures

## Troubleshooting

Common issues and solutions:

1. Authentication Failures:
   - Verify credentials
   - Check registry URL
   - Ensure proper permissions

2. Build Failures:
   - Check Dockerfile syntax
   - Verify build context
   - Review build arguments

3. Push Failures:
   - Verify network connectivity
   - Check registry permissions
   - Validate image tags

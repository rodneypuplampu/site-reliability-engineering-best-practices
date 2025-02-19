# Venv-to-Docker

Automate the process of converting a Python virtual environment into a Docker container repository.

## Project Structure

```
venv-to-docker/
├── .github/
│   └── workflows/
│       └── ci.yml
├── scripts/
│   ├── venv_to_docker.sh
│   ├── validate_dockerfile.sh
│   └── cleanup.sh
├── templates/
│   ├── Dockerfile.template
│   ├── dockerignore.template
│   └── readme.template
├── tests/
│   ├── __init__.py
│   ├── test_dockerfile_generation.py
│   └── test_environment.py
├── .gitignore
├── LICENSE
├── Makefile
└── README.md
```

## Implementation

### 1. Main Script (scripts/venv_to_docker.sh)
```bash
#!/bin/bash

# venv_to_docker.sh - Convert Python virtual environment to Docker container

set -e

# Script variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/../templates"
DEFAULT_VENV_PATH=".venv"
DEFAULT_PYTHON_VERSION="3.9"

# Color outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [-v venv_path] [-p python_version] [-n app_name] [-e entrypoint]"
    echo "  -v: Path to virtual environment (default: .venv)"
    echo "  -p: Python version for Docker image (default: 3.9)"
    echo "  -n: Application name (default: directory name)"
    echo "  -e: Entrypoint script (default: app.py)"
    exit 1
}

# Parse command line arguments
while getopts "v:p:n:e:h" opt; do
    case $opt in
        v) VENV_PATH="$OPTARG" ;;
        p) PYTHON_VERSION="$OPTARG" ;;
        n) APP_NAME="$OPTARG" ;;
        e) ENTRYPOINT="$OPTARG" ;;
        h) usage ;;
        ?) usage ;;
    esac
done

# Set default values if not provided
VENV_PATH=${VENV_PATH:-$DEFAULT_VENV_PATH}
PYTHON_VERSION=${PYTHON_VERSION:-$DEFAULT_PYTHON_VERSION}
APP_NAME=${APP_NAME:-$(basename "$(pwd)")}
ENTRYPOINT=${ENTRYPOINT:-"app.py"}

# Validate virtual environment
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${RED}Error: Virtual environment not found at $VENV_PATH${NC}"
    echo "Create one with: python3 -m venv $VENV_PATH"
    exit 1
fi

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Generate requirements.txt
echo -e "${YELLOW}Generating requirements.txt...${NC}"
pip freeze > requirements.txt

# Create .dockerignore
echo -e "${YELLOW}Creating .dockerignore...${NC}"
cat "$TEMPLATE_DIR/dockerignore.template" > .dockerignore

# Generate Dockerfile
echo -e "${YELLOW}Generating Dockerfile...${NC}"
sed -e "s/{{PYTHON_VERSION}}/$PYTHON_VERSION/g" \
    -e "s/{{ENTRYPOINT}}/$ENTRYPOINT/g" \
    "$TEMPLATE_DIR/Dockerfile.template" > Dockerfile

# Generate project README if it doesn't exist
if [ ! -f "README.md" ]; then
    echo -e "${YELLOW}Generating README.md...${NC}"
    sed -e "s/{{APP_NAME}}/$APP_NAME/g" \
        -e "s/{{PYTHON_VERSION}}/$PYTHON_VERSION/g" \
        -e "s/{{ENTRYPOINT}}/$ENTRYPOINT/g" \
        "$TEMPLATE_DIR/readme.template" > README.md
fi

# Validate Dockerfile
if ! "$SCRIPT_DIR/validate_dockerfile.sh"; then
    echo -e "${RED}Error: Dockerfile validation failed${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully created Docker configuration!${NC}"
echo -e "Next steps:"
echo -e "1. Review the generated files:"
echo -e "   - Dockerfile"
echo -e "   - .dockerignore"
echo -e "   - requirements.txt"
echo -e "2. Build the Docker image:"
echo -e "   docker build -t $APP_NAME ."
echo -e "3. Run the container:"
echo -e "   docker run -it --rm $APP_NAME"
```

### 2. Dockerfile Template (templates/Dockerfile.template)
```dockerfile
FROM python:{{PYTHON_VERSION}}-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run the application
CMD ["python", "{{ENTRYPOINT}}"]
```

### 3. Dockerignore Template (templates/dockerignore.template)
```
# Python
__pycache__
*.py[cod]
*$py.class
*.so
.Python
.venv
venv
ENV/
env/
*.egg
*.egg-info/

# Development
.git
.gitignore
.idea/
.vscode/
*.swp
*.swo

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# Build
*.log
*.pot
*.pyc
.DS_Store
```

### 4. README Template (templates/readme.template)
```markdown
# {{APP_NAME}}

Docker container for {{APP_NAME}} Python application.

## Requirements

- Docker
- Python {{PYTHON_VERSION}}

## Building the Container

```bash
docker build -t {{APP_NAME}} .
```

## Running the Container

```bash
docker run -it --rm {{APP_NAME}}
```

## Development

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python {{ENTRYPOINT}}
   ```
```

### 5. Validation Script (scripts/validate_dockerfile.sh)
```bash
#!/bin/bash

set -e

# Script variables
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}Error: Dockerfile not found${NC}"
    exit 1
fi

# Validate Dockerfile syntax
if ! docker run --rm -i hadolint/hadolint < Dockerfile; then
    echo -e "${RED}Error: Dockerfile linting failed${NC}"
    exit 1
fi

# Check if all required files exist
for file in requirements.txt .dockerignore; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: Required file $file not found${NC}"
        exit 1
    fi
done

echo -e "${GREEN}Dockerfile validation passed${NC}"
exit 0
```

### 6. Cleanup Script (scripts/cleanup.sh)
```bash
#!/bin/bash

# Script variables
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Files to clean up
FILES_TO_CLEAN=(
    "Dockerfile"
    ".dockerignore"
    "requirements.txt"
)

# Clean up generated files
for file in "${FILES_TO_CLEAN[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo -e "${GREEN}Removed $file${NC}"
    fi
done

echo -e "${GREEN}Cleanup complete${NC}"
```

### 7. CI Workflow (.github/workflows/ci.yml)
```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Create test environment
      run: |
        python -m venv .venv
        source .venv/bin/activate
        pip install pytest
    
    - name: Run test script
      run: |
        source .venv/bin/activate
        chmod +x scripts/venv_to_docker.sh
        ./scripts/venv_to_docker.sh -v .venv
    
    - name: Validate Dockerfile
      run: |
        chmod +x scripts/validate_dockerfile.sh
        ./scripts/validate_dockerfile.sh

    - name: Test Docker build
      run: docker build -t test-app .
```

### 8. Makefile
```makefile
.PHONY: install test clean docker-build docker-run

install:
	python -m venv .venv
	. .venv/bin/activate && pip install -r requirements.txt

test:
	. .venv/bin/activate && pytest

clean:
	./scripts/cleanup.sh

docker-build:
	docker build -t $(shell basename $(CURDIR)) .

docker-run:
	docker run -it --rm $(shell basename $(CURDIR))

setup:
	chmod +x scripts/*.sh
	./scripts/venv_to_docker.sh
```

### 9. .gitignore
```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.venv/
venv/
ENV/
env/
*.egg
*.egg-info/

# Development
.idea/
.vscode/
*.swp
*.swo

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# Build
*.log
*.pot
*.pyc
.DS_Store

# Generated files
Dockerfile
.dockerignore
requirements.txt
```

## Usage

1. Clone the repository:
```bash
git clone https://github.com/yourusername/venv-to-docker.git
cd venv-to-docker
```

2. Make scripts executable:
```bash
chmod +x scripts/*.sh
```

3. Run the conversion script:
```bash
./scripts/venv_to_docker.sh -v /path/to/venv -p 3.9 -n myapp -e app.py
```

4. Build and run the Docker container:
```bash
docker build -t myapp .
docker run -it --rm myapp
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

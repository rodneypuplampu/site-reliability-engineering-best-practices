# Debian Linux Setup Guide for Data Pipeline Development

## Table of Contents
- [System Requirements](#system-requirements)
- [Initial Debian Setup](#initial-debian-setup)
- [Development Environment Setup](#development-environment-setup)
- [Directory Structure](#directory-structure)
- [Python Environment Setup](#python-environment-setup)
- [Additional Tools Installation](#additional-tools-installation)
- [Security Considerations](#security-considerations)
- [System Verification](#system-verification)

## System Requirements
- Minimum 4GB RAM (8GB recommended)
- 20GB free disk space
- Debian 11 (Bullseye) or later
- Internet connection for package installation

## Initial Debian Setup

### 1. System Update and Upgrade
```bash
# Update package list and upgrade system
sudo apt update
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential
```

### 2. Install System Dependencies
```bash
# Install required system packages
sudo apt install -y \
    git \
    curl \
    wget \
    vim \
    htop \
    net-tools \
    python3-pip \
    python3-venv \
    python3-dev
```

### 3. Configure System Settings
```bash
# Set up timezone
sudo timedatectl set-timezone UTC

# Configure locale
sudo locale-gen en_US.UTF-8
sudo update-locale LANG=en_US.UTF-8
```

## Development Environment Setup

### 1. Create Project Directory Structure
```bash
# Create main project directory
mkdir -p ~/projects/data-pipeline
cd ~/projects/data-pipeline

# Create subdirectories
mkdir -p {data,logs,config,scripts,notebooks,tests}
mkdir -p data/{raw,processed,temp}
mkdir -p logs/{beam,dagster,system}
mkdir -p config/{beam,dagster,env}
```

### 2. Set Up Version Control
```bash
# Initialize git repository
git init

# Create .gitignore
cat << EOF > .gitignore
venv/
__pycache__/
*.pyc
.env
*.log
data/raw/*
data/processed/*
data/temp/*
logs/*
!logs/.gitkeep
EOF

# Create empty files to preserve directory structure
touch data/{raw,processed,temp}/.gitkeep
touch logs/{beam,dagster,system}/.gitkeep
```

## Python Environment Setup

### 1. Create Virtual Environment
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel
```

### 2. Install Python Packages
```bash
# Create requirements.txt
cat << EOF > requirements.txt
apache-beam==2.50.0
dagster==1.5.11
dagster-pandas==0.21.11
pandas==2.1.1
notebook==7.0.6
pytest==7.4.0
python-dotenv==1.0.0
EOF

# Install requirements
pip install -r requirements.txt
```

## Additional Tools Installation

### 1. Install Development Tools
```bash
# Install additional development tools
sudo apt install -y \
    tmux \
    screen \
    tree \
    jq \
    postgresql-client
```

### 2. Install Monitoring Tools
```bash
# Install monitoring tools
sudo apt install -y \
    prometheus \
    grafana
```

## Security Considerations

### 1. Set Up Project-specific User
```bash
# Create service user
sudo useradd -m -s /bin/bash pipeline_user
sudo usermod -aG sudo pipeline_user

# Set up project directory permissions
sudo chown -R pipeline_user:pipeline_user ~/projects/data-pipeline
```

### 2. Configure Environment Variables
```bash
# Create .env file
cat << EOF > .env.example
BEAM_PIPELINE_NAME=local_pipeline
DAGSTER_HOME=/home/pipeline_user/projects/data-pipeline
LOG_LEVEL=INFO
EOF

# Copy example to actual .env
cp .env.example .env
```

## System Verification

### 1. Verify Installation
```bash
# Check Python installation
python3 --version
pip list

# Check system resources
htop  # Press Q to exit

# Check directory structure
tree -L 3 ~/projects/data-pipeline
```

### 2. Test Development Environment
```bash
# Create and run test script
cat << EOF > tests/test_env.py
import apache_beam
import dagster
import pandas
import sys

def test_imports():
    modules = [apache_beam, dagster, pandas]
    for module in modules:
        print(f"{module.__name__}: {module.__version__}")

if __name__ == "__main__":
    test_imports()
EOF

# Run test script
python tests/test_env.py
```

## Directory Structure Explanation

The project follows this structure:
```
data-pipeline/
├── config/
│   ├── beam/       # Apache Beam configuration files
│   ├── dagster/    # Dagster configuration files
│   └── env/        # Environment-specific configs
├── data/
│   ├── raw/        # Input data files
│   ├── processed/  # Processed data files
│   └── temp/       # Temporary data files
├── logs/
│   ├── beam/       # Apache Beam logs
│   ├── dagster/    # Dagster logs
│   └── system/     # System logs
├── notebooks/      # Jupyter notebooks
├── scripts/        # Utility scripts
├── tests/          # Test files
├── venv/          # Virtual environment
├── .env           # Environment variables
├── .gitignore     # Git ignore rules
└── requirements.txt # Python dependencies
```

Each directory serves a specific purpose:
- `config/`: Contains all configuration files
- `data/`: Stores all data files in different stages
- `logs/`: Contains all log files
- `notebooks/`: For interactive development
- `scripts/`: Utility and automation scripts
- `tests/`: All test files

## Next Steps
1. Customize the setup based on your specific needs
2. Set up automated backups
3. Configure monitoring and alerting
4. Implement logging rotation
5. Set up CI/CD pipeline
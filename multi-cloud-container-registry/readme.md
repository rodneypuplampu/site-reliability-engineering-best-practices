# Harbor Multi-Cloud Container Registry

This repository contains infrastructure code and configuration for deploying Harbor Container Registry with multi-cloud replication to GCP, Azure, and AWS.

## Features

- Harbor container registry deployment
- Multi-cloud replication
- GitHub Actions integration
- Automated container distribution
- RBAC and security policies
- High availability setup

## Prerequisites

- Kubernetes cluster
- Helm 3.x
- kubectl
- Cloud provider credentials
- GitHub account
- Domain name for Harbor

## Quick Start

1. Clone the repository
2. Configure cloud credentials
3. Update configuration
4. Deploy Harbor
5. Set up replication

```bash
git clone https://github.com/your-org/harbor-multicloud
cd harbor-multicloud
./scripts/install.sh
```

# Project Structure
.
├── README.md
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── provider.tf
├── kubernetes/
│   ├── cloud-router.yaml
│   └── bgp-config.yaml
├── scripts/
│   ├── install.sh
│   └── validate.sh
└── docs/
    ├── setup.md
    └── troubleshooting.md

# README.md
# Anthos Bare Metal Cloud Router

This repository contains the infrastructure code to deploy an Anthos bare metal cloud router for BGP routing between AWS and Google Cloud Platform.

## Prerequisites

- Google Cloud SDK
- kubectl
- Terraform >= 1.0.0
- AWS CLI
- Anthos bare metal admin workstation

## Quick Start

1. Clone this repository
2. Configure your credentials
3. Run the installation script
4. Validate the deployment

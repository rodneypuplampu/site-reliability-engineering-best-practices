# GKE Infrastructure Automation Project

## Project Structure
```
infra-automation/
├── .github/
│   └── workflows/
│       ├── dev-pipeline.yml
│       ├── prod-pipeline.yml
│       └── pr-validation.yml
├── helm/
│   ├── charts/
│   │   ├── gke-cluster/
│   │   │   ├── Chart.yaml
│   │   │   ├── values.yaml
│   │   │   └── templates/
│   │   │       ├── cluster.yaml
│   │   │       ├── node-pools.yaml
│   │   │       └── network.yaml
│   │   ├── security/
│   │   │   ├── Chart.yaml
│   │   │   ├── values.yaml
│   │   │   └── templates/
│   │   │       ├── policies.yaml
│   │   │       ├── secrets.yaml
│   │   │       └── rbac.yaml
│   │   └── apis/
│   │       ├── Chart.yaml
│   │       ├── values.yaml
│   │       └── templates/
│   │           ├── cloud-sql.yaml
│   │           ├── pubsub.yaml
│   │           └── storage.yaml
│   └── environments/
│       ├── dev/
│       │   └── values.yaml
│       └── prod/
│           └── values.yaml
├── terraform/
│   ├── modules/
│   │   ├── gke/
│   │   ├── networking/
│   │   └── service-accounts/
│   └── environments/
│       ├── dev/
│       │   ├── main.tf
│       │   └── variables.tf
│       └── prod/
│           ├── main.tf
│           └── variables.tf
├── scripts/
│   ├── validate_helm.sh
│   ├── validate_terraform.sh
│   ├── security_scan.sh
│   └── deployment_validation.py
├── tests/
│   ├── integration/
│   │   └── test_infrastructure.py
│   └── unit/
│       └── test_terraform_modules.py
└── README.md
```

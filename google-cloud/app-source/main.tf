# main.tf
terraform {
  required_version = ">= 1.0"
  
  backend "gcs" {
    bucket = "PROJECT_ID-terraform-state"
    prefix = "terraform/signin-app"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_client_config" "default" {}

data "google_container_cluster" "my_cluster" {
  name     = var.cluster_name
  location = var.region
}

provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.my_cluster.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.my_cluster.master_auth[0].cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${data.google_container_cluster.my_cluster.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(data.google_container_cluster.my_cluster.master_auth[0].cluster_ca_certificate)
  }
}

# Create namespace
resource "kubernetes_namespace" "usersignin" {
  metadata {
    name = "usersignin"
  }
}

# Create secrets
resource "kubernetes_secret" "django_secrets" {
  metadata {
    name      = "django-secrets"
    namespace = kubernetes_namespace.usersignin.metadata[0].name
  }

  data = {
    "secret-key" = var.django_secret_key
  }
}

resource "kubernetes_secret" "alloydb_credentials" {
  metadata {
    name      = "alloydb-credentials"
    namespace = kubernetes_namespace.usersignin.metadata[0].name
  }

  data = {
    password = var.db_password
  }
}

# Deploy Helm chart
resource "helm_release" "django_signin" {
  name       = "django-signin"
  namespace  = kubernetes_namespace.usersignin.metadata[0].name
  chart      = "../helm/django-signin"
  
  values = [
    file("../helm/django-signin/values.yaml")
  ]

  set {
    name  = "image.repository"
    value = "gcr.io/${var.project_id}/django-signin"
  }

  set {
    name  = "alloydb.host"
    value = var.alloydb_host
  }

  depends_on = [
    kubernetes_namespace.usersignin,
    kubernetes_secret.django_secrets,
    kubernetes_secret.alloydb_credentials
  ]
}

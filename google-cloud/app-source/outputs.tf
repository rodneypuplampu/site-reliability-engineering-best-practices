# outputs.tf
output "namespace" {
  value = kubernetes_namespace.usersignin.metadata[0].name
}

output "helm_release_status" {
  value = helm_release.django_signin.status
}

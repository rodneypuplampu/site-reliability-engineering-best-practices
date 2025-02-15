# AlloyDB instance
resource "google_alloydb_instance" "default" {
  cluster       = google_alloydb_cluster.default.name
  instance_id   = "primary-instance"
  instance_type = "PRIMARY"

  machine_config {
    cpu_count = 4
  }
}

resource "google_alloydb_cluster" "default" {
  cluster_id = "${var.project_id}-db"
  location   = var.region
  network    = google_compute_network.vpc.name

  initial_user {
    password = var.db_password
  }
}

# Cloud CDN configuration
resource "google_compute_backend_bucket" "static" {
  name        = "${var.project_id}-static"
  bucket_name = google_storage_bucket.static.name
  enable_cdn  = true
}

resource "google_storage_bucket" "static" {
  name          = "${var.project_id}-static-assets"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

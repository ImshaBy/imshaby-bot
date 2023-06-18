terraform {
  required_providers {
    yandex = {
      source = "yandex-cloud/yandex"
    }
  }
  backend "s3" {
    endpoint   = "storage.yandexcloud.net"
    bucket     = "tf-bucket-imshaby"
    region     = "ru-central1"
    key        = "imshaby-bot/production/terraform.tfstate"
    access_key = "${ACCESS_KEY}"

    secret_key = "${SECRET_KEY}"

    dynamodb_endpoint =  "${DYNAMODB_ENDPOINT}"

    dynamodb_table    = "state-lock-table"
    skip_region_validation      = true
    skip_credentials_validation = true
  }
  required_version = ">= 0.13"
}

provider "yandex" {
  alias = "yc_ru-central1-a"
  zone = var.az
}
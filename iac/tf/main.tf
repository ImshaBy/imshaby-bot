terraform {
  required_providers {
    yandex = {
      source = "yandex-cloud/yandex"
    }
  }
  required_version = ">= 0.13"

}


provider "yandex" {
  alias = "yc_ru-central1-a"
  zone = var.az
}

data "yandex_compute_image" "container-optimized-image" {
  family = "container-optimized-image"
}

data "yandex_vpc_subnet" "default_subnet" {
  name = var.subnet_name
}

data "yandex_iam_service_account" "deployer" {
  name = var.service_acc_name
}

resource "yandex_serverless_container" "bot-container" {
   name               = var.bot_container_name
   memory             = 256
   service_account_id = data.yandex_iam_service_account.deployer.id
   image {
       url = "${DOCKER_IMAGE}"
   }
}

# yc serverless container allow-unauthenticated-invoke <container_name>

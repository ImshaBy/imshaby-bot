
variable "subnet_name" {
  type        = string
}

variable "az" {
  type        = string
  default     = "ru-central1-a"
}


variable "service_acc_name" {
  type        = string
}

variable "cms_app_name" {
  type        = string
}

// Compute Instance
variable "platform_id" {
  type        = string
  default     = "standard-v3"
}

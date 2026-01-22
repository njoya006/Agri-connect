variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "key_name" {
  description = "Existing EC2 key pair name to use for instance SSH access"
  type        = string
}

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "db_identifier" {
  description = "RDS instance identifier"
  type        = string
  default     = "agriconnect-db"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "agridbadmin"
}

variable "db_password" {
  description = "RDS master password (sensitive)"
  type        = string
  sensitive   = true
}

variable "s3_bucket" {
  description = "S3 bucket name for media"
  type        = string
  default     = "agriconnect-media"
}

variable "docker_image" {
  description = "Docker image to run on EC2 (ECR or DockerHub)"
  type        = string
  default     = "your-docker-image:latest"
}

variable "secret_name" {
  description = "Secrets Manager secret name for DB credentials"
  type        = string
  default     = "agriconnect/db_credentials"
}

output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.web.public_ip
}

output "rds_endpoint" {
  description = "RDS instance endpoint address"
  value       = aws_db_instance.postgres.address
}

output "s3_bucket" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.media.bucket
}

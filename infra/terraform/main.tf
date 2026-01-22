data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Find Ubuntu 22.04 AMI via SSM parameter (region-specific)
data "aws_ssm_parameter" "ubuntu_22_04" {
  name = "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
}

resource "aws_security_group" "web_sg" {
  name        = "agri-web-sg"
  description = "Allow HTTP/HTTPS from anywhere and 8000 from self"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # allow 8000 from instances in this group
  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.web_sg.id]
    description     = "Allow port 8000 from same SG"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db_sg" {
  name        = "agri-db-sg"
  description = "Allow Postgres from web SG only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web_sg.id]
    description     = "Postgres from web servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_s3_bucket" "media" {
  bucket = var.s3_bucket

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = {
    Name = "agriconnect-media"
  }
}

resource "aws_db_subnet_group" "db_subnets" {
  name       = "${var.db_identifier}-subnet-group"
  subnet_ids = slice(data.aws_subnets.default.ids, 0, 2)
  tags = {
    Name = "agriconnect-db-subnet-group"
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = var.db_identifier
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = var.db_instance_class
  name                   = "agriconnect"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  backup_retention_period = 7
}

resource "aws_instance" "web" {
  ami                    = data.aws_ssm_parameter.ubuntu_22_04.value
  instance_type          = var.ec2_instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  key_name               = var.key_name
  associate_public_ip_address = true

  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  user_data = templatefile("./cloud-init.tpl", {
    rds_endpoint = aws_db_instance.postgres.address,
    db_user      = var.db_username,
    secret_arn   = aws_secretsmanager_secret.db_creds.arn,
    s3_bucket    = aws_s3_bucket.media.bucket,
    docker_image = var.docker_image
  })

  tags = {
    Name = "agri-connect-backend"
  }
}

# Secrets Manager: store DB credentials so EC2 can fetch them via IAM role
resource "aws_secretsmanager_secret" "db_creds" {
  name = var.secret_name
}

resource "aws_secretsmanager_secret_version" "db_creds_ver" {
  secret_id     = aws_secretsmanager_secret.db_creds.id
  secret_string = jsonencode({
    username = var.db_username,
    password = var.db_password,
    host     = aws_db_instance.postgres.address,
    port     = 5432,
    dbname   = "agriconnect"
  })
}

# IAM role for EC2 to allow access to S3 and Secrets Manager
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2_role" {
  name               = "agriconnect-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_policy" "ec2_policy" {
  name        = "agriconnect-ec2-policy"
  description = "Allow access to S3 bucket and Secrets Manager for the app"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ],
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:DescribeImages"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        Resource = [
          aws_secretsmanager_secret.db_creds.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_ec2_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ec2_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "agriconnect-ec2-instance-profile"
  role = aws_iam_role.ec2_role.name
}

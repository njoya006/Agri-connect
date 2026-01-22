# Terraform for AgriConnect (quick deploy)

This Terraform config provisions a minimal environment in the AWS default VPC:
- EC2 `t3.medium` Ubuntu 22.04 instance
- RDS PostgreSQL `db.t3.small` instance
- S3 bucket for media with versioning
- Security groups: `agri-web-sg` and `agri-db-sg` with intended rules

IMPORTANT: This is a minimal example for quick deployment. Review and customize before applying in production.

Usage (example):

```bash
cd infra/terraform
terraform init
terraform plan -var 'key_name=agri-key' -var 'db_password=YourStrongPassword'
terraform apply -var 'key_name=agri-key' -var 'db_password=YourStrongPassword' -auto-approve
```

Notes:
- The config uses the AWS default VPC and the SSM parameter to select the Ubuntu 22.04 AMI for the chosen region.
- Provide an existing EC2 key pair name via `-var key_name=...` (or create one in the console / CLI).
- The RDS password should be provided via `-var db_password` or via environment var `TF_VAR_db_password`.
- For production, replace single-instance EC2 with an ALB + Auto Scaling Group and put RDS in private subnets with Multi-AZ.
- Consider storing secrets in AWS Secrets Manager and granting the EC2 instance an IAM role.
- This Terraform now creates a Secrets Manager secret and an IAM instance profile attached to the EC2 instance so the instance can fetch DB credentials at startup.
- Set the `docker_image` variable to your app image (ECR or Docker Hub). Example:

```bash
terraform plan -var 'key_name=agri-key' -var 'db_password=YourStrongPassword' -var "docker_image=your/ecr-image:tag"
terraform apply -var 'key_name=agri-key' -var 'db_password=YourStrongPassword' -var "docker_image=your/ecr-image:tag" -auto-approve
```

Notes on ECR and systemd:
- If your `docker_image` is stored in ECR, Terraform grants the EC2 role permission to pull images and the cloud-init will perform an `aws ecr get-login-password` and `docker login` before pulling.
- The cloud-init now creates a `systemd` service `agri-backend.service` that runs your container and restarts it on failure.

Local Terraform on Windows (quick):

- Install via Chocolatey (requires admin PowerShell):

```powershell
choco install terraform -y
```

- Or download the zip from https://developer.hashicorp.com/terraform/downloads and add to your PATH.

Basic local checks:

```powershell
cd infra/terraform
terraform fmt -recursive
terraform init -input=false -backend=false
terraform validate
```

If you cannot run Terraform locally, CI will run these checks for you automatically (see `.github/workflows/terraform.yml`).

Linting with TFLint:

The CI will also run `tflint` to catch common Terraform issues. To run locally, install `tflint` (https://github.com/terraform-linters/tflint) and run:

```powershell
tflint --init
tflint
```

Deploy via GitHub Actions (one-click)
----------------------------------

If you prefer not to run Terraform locally, you can trigger the deploy from GitHub Actions. Steps:

1. Add these repository secrets (Settings → Secrets → Actions):
	- `AWS_ACCESS_KEY_ID` — IAM user access key with permissions to create resources (or a deploy role).
	- `AWS_SECRET_ACCESS_KEY` — the corresponding secret.
	- `TF_VAR_key_name` — EC2 key pair name (or any required var used by the Terraform config).
	- `TF_VAR_db_password` — the RDS master password (sensitive).
	- `TF_VAR_docker_image` — the container image to run on the EC2 instance (or ECR image).

2. Open the Actions tab in the repository, choose the workflow `Infra Deploy (manual)`, click "Run workflow", select `environment` (dev/prod), and run.

3. The workflow will run `terraform init`, `terraform plan`, and `terraform apply` in `infra/terraform` using the secrets you configured.

Security note: grant the least privilege necessary to the IAM user used by `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`. For production, use an OIDC-based workflow role instead of long-lived keys.



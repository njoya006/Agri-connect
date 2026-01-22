AWS ECS Fargate deployment helper

This folder contains helper files and a GitHub Actions workflow to deploy the Django backend to AWS ECS Fargate.

What I added
- infra/ecs/taskdef.template.json — task definition template with placeholders.
- .github/workflows/deploy-backend-ecs.yml — CI workflow to build image, push to ECR, register task definition, and update ECS service.

What you must provision in AWS first (manual or via Terraform/CloudFormation)
- ECR repository (name matches `ECR_REPO` secret)
- ECS cluster
- ECS service (Fargate) attached to cluster and an ALB target group (service must exist; workflow will update it)
- IAM Roles:
  - `EXECUTION_ROLE_ARN` — ECS task execution role (policy: AmazonECSTaskExecutionRolePolicy, access to ECR + CloudWatch Logs)
  - `TASK_ROLE_ARN` — optional task role for application permissions
- RDS Postgres instance and subnet/security groups
- ElastiCache Redis (or a managed Redis) for Celery/Channels
- ALB and DNS if you want public access

Required GitHub repository secrets (set these before running workflow)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g., us-east-1)
- `ECR_REPO` (ECR repository name; workflow will create repo if missing)
- `ECS_CLUSTER` (ECS cluster name)
- `ECS_SERVICE` (ECS service name; must be created ahead)
- `TASK_FAMILY` (task definition family name)
- `CONTAINER_NAME` (container name used in taskdef)
- `EXECUTION_ROLE_ARN` (ARN of ECS task execution role)
- `TASK_ROLE_ARN` (ARN of task role; optional)

Optional / recommended secrets for runtime environment variables (set in AWS Parameter Store / Secrets Manager and mount/configure in task definition):
- `DJANGO_SECRET_KEY`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`
- `DEFAULT_FROM_EMAIL`

Notes
- The workflow expects the backend Dockerfile at `backend/Dockerfile` and builds the project root context.
- I kept the task definition simple; adapt `cpu`, `memory`, environment, and mount points to your needs.
- For sensitive environment settings, prefer AWS Secrets Manager or SSM Parameter Store and inject into the task definition instead of baking into the image.

Next steps I can take for you
- Add Terraform to create ECR, ECS cluster, ALB, RDS and ElastiCache resources.
- Add an automated CloudFormation/Terraform step in CI that applies infra changes.
- Modify the task definition to load secrets from Secrets Manager.

Which of the next steps do you want me to do?
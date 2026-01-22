#!/bin/bash
set -e
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg lsb-release awscli jq

# install docker
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

# Fetch DB credentials from Secrets Manager
SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "${secret_arn}" --region ${var:AWS_REGION:-us-west-2} --query SecretString --output text)
DB_USER=$(echo "$SECRET_JSON" | jq -r .username)
DB_PASS=$(echo "$SECRET_JSON" | jq -r .password)
DB_HOST=$(echo "$SECRET_JSON" | jq -r .host)
DB_NAME=$(echo "$SECRET_JSON" | jq -r .dbname)


# If the image is in ECR, login first
REGISTRY=$(echo "${docker_image}" | cut -d'/' -f1)
if echo "$REGISTRY" | grep -qE "[0-9]+\.dkr\.ecr"; then
  aws ecr get-login-password --region ${var:AWS_REGION:-us-west-2} | docker login --username AWS --password-stdin "$REGISTRY"
fi

docker pull ${docker_image}

# Create systemd service to run the container reliably
cat > /etc/systemd/system/agri-backend.service <<'EOF'
[Unit]
Description=AgriConnect backend container
After=docker.service
Requires=docker.service

[Service]
Restart=always
ExecStartPre=-/usr/bin/docker rm -f agri-backend
ExecStart=/usr/bin/docker run --name agri-backend \
  -e DATABASE_HOST="$DB_HOST" \
  -e DATABASE_NAME="$DB_NAME" \
  -e DATABASE_USER="$DB_USER" \
  -e DATABASE_PASSWORD="$DB_PASS" \
  -e S3_BUCKET="${s3_bucket}" \
  -p 8000:8000 ${docker_image}
ExecStop=/usr/bin/docker stop agri-backend
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now agri-backend

echo "App container started via systemd"

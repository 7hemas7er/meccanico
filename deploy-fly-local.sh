#!/bin/bash

# deploy-fly-local.sh
# Cost-optimized Fly.io deployment with local Docker build

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="meccanico"
REGISTRY="registry.fly.io"
TIMESTAMP=$(date +%s)
IMAGE_TAG="deployment-${TIMESTAMP}"
FULL_IMAGE_NAME="${REGISTRY}/${APP_NAME}:${IMAGE_TAG}"

echo -e "${YELLOW}🚀 Starting cost-optimized Fly.io deployment...${NC}"

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ flyctl is not installed. Please install it first:${NC}"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Authenticate with Fly.io Docker registry
echo -e "${YELLOW}🔐 Authenticating with Fly.io Docker registry...${NC}"
flyctl auth docker

# Build Docker image locally
echo -e "${YELLOW}🔨 Building Docker image locally...${NC}"
echo "Image: ${FULL_IMAGE_NAME}"
docker build -t "${FULL_IMAGE_NAME}" .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

# Push image to Fly.io registry
echo -e "${YELLOW}📤 Pushing image to Fly.io registry...${NC}"
docker push "${FULL_IMAGE_NAME}"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker push failed!${NC}"
    exit 1
fi

# Deploy using the pushed image
echo -e "${YELLOW}🚀 Deploying to Fly.io...${NC}"
flyctl deploy --image "${FULL_IMAGE_NAME}" --app "${APP_NAME}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 App available at: https://${APP_NAME}.fly.dev/${NC}"
    echo -e "${GREEN}📊 No build costs charged (local build used)${NC}"
    
    # Clean up old local images (optional)
    echo -e "${YELLOW}🧹 Cleaning up old local images...${NC}"
    docker image prune -f --filter="label=fly.build" || true
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Cost-optimized deployment completed successfully!${NC}"
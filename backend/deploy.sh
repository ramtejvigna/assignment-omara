#!/bin/bash

# Configuration
DOCKER_USERNAME="ramtejvigna"
DOCKER_REPO="strategy-analyst-backend"
PROJECT_ID="ramt-76ff5"
SERVICE_NAME="strategy-analyst-backend"
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment process...${NC}"

# Step 1: Build Docker image
echo -e "${YELLOW}📦 Building Docker image...${NC}"
docker build -t $DOCKER_USERNAME/$DOCKER_REPO:latest .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Step 2: Push to Docker Hub
echo -e "${YELLOW}📤 Pushing to Docker Hub...${NC}"
docker push $DOCKER_USERNAME/$DOCKER_REPO:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker push failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Image pushed to Docker Hub successfully${NC}"

# Step 3: Deploy to Cloud Run
echo -e "${YELLOW}☁️  Deploying to Google Cloud Run...${NC}"

gcloud run deploy $SERVICE_NAME \
    --image docker.io/$DOCKER_USERNAME/$DOCKER_REPO:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --set-env-vars "PORT=8080" \
    --project $PROJECT_ID

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cloud Run deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}Your service is now running on Google Cloud Run${NC}" 
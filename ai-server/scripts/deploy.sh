#!/bin/bash

# Script deploy AI Server lên GCP Cloud Run
# Sử dụng: bash deploy_gcp.sh [--project PROJECT_ID] [--region REGION] [--service-name SERVICE_NAME]

set -e

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
PROJECT_ID=""
REGION="asia-southeast1"  # Singapore (gần Việt Nam)
SERVICE_NAME="ai-server"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --service-name)
            SERVICE_NAME="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Usage: bash deploy_gcp.sh [--project PROJECT_ID] [--region REGION] [--service-name SERVICE_NAME]"
            exit 1
            ;;
    esac
done

# Kiểm tra PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  PROJECT_ID not provided. Trying to get from gcloud...${NC}"
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}❌ Error: PROJECT_ID is required.${NC}"
        echo "Please provide it with --project flag or set it with: gcloud config set project PROJECT_ID"
        exit 1
    fi
    echo -e "${GREEN}✅ Using project: ${PROJECT_ID}${NC}"
fi

IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${GREEN}🚀 Deploying AI Server to GCP Cloud Run...${NC}"
echo -e "${GREEN}📦 Project: ${PROJECT_ID}${NC}"
echo -e "${GREEN}🌍 Region: ${REGION}${NC}"
echo -e "${GREEN}🏷️  Service: ${SERVICE_NAME}${NC}"
echo -e "${GREEN}🐳 Image: ${IMAGE_NAME}${NC}"
echo ""

# Kiểm tra đã login GCP chưa
echo -e "${GREEN}🔐 Checking GCP authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated. Running gcloud auth login...${NC}"
    gcloud auth login
fi

# Set project
echo -e "${GREEN}🔧 Setting GCP project...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${GREEN}🔧 Enabling required GCP APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build Docker image
echo -e "${GREEN}🐳 Building Docker image...${NC}"
gcloud builds submit --tag ${IMAGE_NAME} --file Dockerfile .

# Deploy to Cloud Run
echo -e "${GREEN}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0 \
    --set-env-vars ENVIRONMENT=production,LOG_LEVEL=INFO

# Get service URL
echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format="value(status.url)")
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}📚 API Docs: ${SERVICE_URL}/docs${NC}"
echo -e "${GREEN}❤️  Health: ${SERVICE_URL}/health${NC}"
echo ""

# Lưu ý về environment variables
echo -e "${YELLOW}⚠️  IMPORTANT: Set environment variables in Cloud Run:${NC}"
echo -e "${YELLOW}   gcloud run services update ${SERVICE_NAME} --region ${REGION} --update-env-vars KEY=VALUE${NC}"
echo -e "${YELLOW}   Or use Cloud Console: Cloud Run > ${SERVICE_NAME} > Edit & Deploy New Revision > Variables & Secrets${NC}"
echo ""
echo -e "${YELLOW}📝 Required environment variables (from env.example):${NC}"
echo -e "${YELLOW}   - DATABASE_URL${NC}"
echo -e "${YELLOW}   - SUPABASE_URL${NC}"
echo -e "${YELLOW}   - SUPABASE_PUBLISHABLE_KEY${NC}"
echo -e "${YELLOW}   - SUPABASE_CURRENT_KEY${NC}"
echo -e "${YELLOW}   - SUPABASE_STANDBY_KEY${NC}"
echo -e "${YELLOW}   - GEMINI_API_KEY${NC}"
echo -e "${YELLOW}   - UPSTASH_REDIS_REST_URL${NC}"
echo -e "${YELLOW}   - UPSTASH_REDIS_REST_TOKEN${NC}"
echo -e "${YELLOW}   - BACKEND_CORS_ORIGINS${NC}"


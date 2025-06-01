#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Keepr Backend Deployment Script${NC}"
echo "=================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud SDK not installed. Please install it first:${NC}"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}🔐 Please login to Google Cloud:${NC}"
    gcloud auth login
fi

# Get or set project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}📝 Please enter your Google Cloud Project ID:${NC}"
    read -p "Project ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}📦 Using project: $PROJECT_ID${NC}"

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Set environment variables (you'll need to set these in Cloud Run later)
echo -e "${YELLOW}⚠️  IMPORTANT: Don't forget to set these environment variables in Cloud Run:${NC}"
echo "- GOOGLE_API_KEY"
echo "- PINECONE_API_KEY"
echo "- PINECONE_INDEX_NAME"
echo "- PINECONE_ENVIRONMENT"
echo ""

# Choose deployment method
echo -e "${YELLOW}🚀 Choose deployment method:${NC}"
echo "1) Cloud Run (Recommended - Serverless, pay-per-use)"
echo "2) App Engine (Always-on, simpler setup)"
read -p "Enter choice (1 or 2): " DEPLOY_METHOD

if [ "$DEPLOY_METHOD" == "1" ]; then
    # Deploy to Cloud Run
    echo -e "${GREEN}🚀 Deploying to Cloud Run...${NC}"
    gcloud run deploy keepr-backend \
        --source . \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --port 8080 \
        --memory 512Mi \
        --cpu 1 \
        --max-instances 10

elif [ "$DEPLOY_METHOD" == "2" ]; then
    # Deploy to App Engine
    echo -e "${GREEN}🚀 Deploying to App Engine...${NC}"
    gcloud app deploy app.yaml --quiet

else
    echo -e "${RED}❌ Invalid choice. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Set environment variables in Google Cloud Console"
echo "2. Test your API endpoints"
echo "3. Update your SDK endpoint configuration" 
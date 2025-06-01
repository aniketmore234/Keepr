# 🚀 Keepr Backend Deployment Guide

Deploy your Keepr backend to Google Cloud using free credits and get your API live!

## 📋 Prerequisites

1. **Google Cloud Account** with free credits ($300 for new users)
2. **Google Cloud SDK** installed on your machine
3. **API Keys** for Gemini and Pinecone

## 🔧 Setup Instructions

### Step 1: Install Google Cloud SDK

**macOS:**
```bash
brew install --cask google-cloud-sdk
```

**Windows/Linux:**
Download from: https://cloud.google.com/sdk/docs/install

### Step 2: Login and Setup Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create keepr-backend-XXXXXX --name="Keepr Backend"

# Set the project as default
gcloud config set project keepr-backend-XXXXXX
```

### Step 3: Prepare Your Environment Variables

Before deploying, make sure you have:
- `GOOGLE_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `PINECONE_API_KEY` - Get from [Pinecone Console](https://www.pinecone.io/)
- `PINECONE_INDEX_NAME` - Your Pinecone index name
- `PINECONE_ENVIRONMENT` - Your Pinecone environment (e.g., us-east1-aws)

## 🚀 Deploy Options

### Option 1: Quick Deploy (Recommended)

Navigate to your backend directory and run the automated script:

```bash
cd backend
./deploy.sh
```

This script will:
- ✅ Check if Google Cloud SDK is installed
- ✅ Login and set up your project
- ✅ Enable required APIs
- ✅ Deploy to Cloud Run or App Engine
- ✅ Give you the deployment URL

### Option 2: Manual Cloud Run Deployment

```bash
cd backend

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

# Deploy to Cloud Run
gcloud run deploy keepr-backend \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --max-instances 10
```

### Option 3: Manual App Engine Deployment

```bash
cd backend

# Deploy to App Engine
gcloud app deploy app.yaml
```

## ⚙️ Post-Deployment Configuration

### 1. Set Environment Variables

**For Cloud Run:**
```bash
gcloud run services update keepr-backend \
    --set-env-vars="GOOGLE_API_KEY=your-gemini-key,PINECONE_API_KEY=your-pinecone-key,PINECONE_INDEX_NAME=your-index,PINECONE_ENVIRONMENT=your-env" \
    --region=us-central1
```

**For App Engine:**
Update `app.yaml` with your environment variables:
```yaml
env_variables:
  GOOGLE_API_KEY: "your-gemini-key"
  PINECONE_API_KEY: "your-pinecone-key"
  PINECONE_INDEX_NAME: "your-index"
  PINECONE_ENVIRONMENT: "your-env"
```

### 2. Test Your Deployment

After deployment, you'll get a URL like:
- **Cloud Run:** `https://keepr-backend-XXXXXX-uc.a.run.app`
- **App Engine:** `https://your-project.appspot.com`

Test your API:
```bash
# Test health endpoint
curl https://your-deployment-url.com/

# Test memory creation
curl -X POST https://your-deployment-url.com/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Test memory",
    "title": "Test"
  }'
```

## 💰 Cost Optimization (Free Tier)

### Cloud Run (Recommended)
- ✅ **2 million requests/month FREE**
- ✅ **400,000 GB-seconds FREE**
- ✅ Only pay when your API is used
- ✅ Automatic scaling to zero

### App Engine
- ✅ **28 frontend instance hours/day FREE**
- ✅ **9 backend instance hours/day FREE**
- ⚠️ Always-on instances (uses more quota)

## 🔄 Update Your SDK

Once deployed, update your SDK configuration:

```typescript
const keepr = new KeeprSDK({
  endpoint: 'https://your-deployment-url.com',
  apiKey: 'optional-api-key'
});
```

## 🛠️ Monitoring and Logs

### View Logs
```bash
# Cloud Run logs
gcloud run services logs read keepr-backend --region us-central1

# App Engine logs
gcloud app logs read
```

### Monitor Usage
- Visit [Google Cloud Console](https://console.cloud.google.com)
- Navigate to Cloud Run or App Engine
- Monitor requests, memory usage, and costs

## 🔒 Security Best Practices

1. **Never commit API keys** to your repository
2. **Use environment variables** for all secrets
3. **Set up proper CORS** for your frontend domains
4. **Monitor API usage** to prevent abuse
5. **Consider adding authentication** for production use

## 📊 API Endpoints Available

After deployment, your API will have these endpoints:

- `GET /` - Health check
- `POST /api/memories` - Create memories
- `POST /api/search` - Search memories
- `GET /api/conversations` - Get conversations
- `POST /api/upload` - Upload files

## 🚨 Troubleshooting

### Common Issues:

1. **"Permission denied"** - Run `gcloud auth login`
2. **"Project not found"** - Check project ID with `gcloud config list`
3. **"API not enabled"** - Run the deployment script to enable APIs
4. **"Out of memory"** - Increase memory allocation in Cloud Run
5. **"Connection refused"** - Check if app listens on port 8080

### Get Help:
- Check deployment logs: `gcloud run services logs read keepr-backend`
- Verify environment variables are set correctly
- Test locally first: `npm start` in backend directory

## 🎉 Success!

Once deployed successfully:
1. ✅ Your API is live and accessible worldwide
2. ✅ Your SDK can make real API calls
3. ✅ You're using Google Cloud's free tier
4. ✅ Your app can handle real users!

**Next steps:** Start building your frontend and mobile apps using the SDK! 🚀 
# 📱 Frontend Deployment Guide for Keepr

This guide will help you deploy your backend and configure your mobile app to connect to the deployed backend for APK distribution.

## 🚀 Part 1: Deploy Backend to Google Cloud

### Prerequisites
✅ Google Cloud SDK installed (you have this already)
✅ Google Cloud account with billing enabled

### Step 1: Login and Setup
```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (replace XXXXXX with random characters)
gcloud projects create keepr-backend-XXXXXX --name="Keepr Backend"

# Set the project as default
gcloud config set project keepr-backend-XXXXXX

# Enable billing for the project (required for deployment)
# Go to: https://console.cloud.google.com/billing
```

### Step 2: Set Environment Variables
Before deploying, you'll need your API keys:

**Required Environment Variables:**
- `GOOGLE_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `PINECONE_API_KEY` - Get from [Pinecone Console](https://www.pinecone.io/)
- `PINECONE_INDEX_NAME` - Your Pinecone index name
- `PINECONE_ENVIRONMENT` - Your Pinecone environment

### Step 3: Deploy Backend
```bash
cd backend

# Run the deployment script
./deploy.sh
```

**Choose Option 1 (Cloud Run)** when prompted - it's recommended for cost efficiency.

### Step 4: Configure Environment Variables in Cloud Console
After deployment, set your environment variables:

```bash
gcloud run services update keepr-backend \
    --set-env-vars="GOOGLE_API_KEY=your-actual-key,PINECONE_API_KEY=your-actual-key,PINECONE_INDEX_NAME=your-index,PINECONE_ENVIRONMENT=your-env" \
    --region=us-central1
```

### Step 5: Get Your Deployment URL
The deployment will give you a URL like:
- **Cloud Run**: `https://keepr-backend-XXXXXX-uc.a.run.app`
- **App Engine**: `https://your-project.appspot.com`

**⚠️ IMPORTANT: Copy this URL - you'll need it for the frontend configuration!**

## 📱 Part 2: Configure Frontend for Production

### Step 1: Update Environment Configuration
Open `recallr/src/config/environment.ts` and update the production config:

```typescript
// Production configuration (deployed backend)
const productionConfig: Environment = {
  // Replace with your actual deployed URL from Step 5 above
  API_BASE_URL: 'https://your-actual-deployed-url.com',
  UPLOADS_BASE_PATH: 'https://your-actual-deployed-url.com/uploads',
  ENVIRONMENT: 'production',
};
```

### Step 2: Switch to Production Mode
In the same file, change:
```typescript
// Change this to true when building APK for deployment
const USE_PRODUCTION = true;
```

### Step 3: Test the Configuration
Run your app and test that it connects to the deployed backend:

```bash
cd recallr
npx react-native run-android
# or
npx react-native run-ios
```

## 🔧 Part 3: Build APK for Distribution

### Step 1: Build Release APK
```bash
cd recallr/android
./gradlew assembleRelease
```

The APK will be created at: `recallr/android/app/build/outputs/apk/release/app-release.apk`

### Step 2: Test the APK
Install the APK on a device and test:
- Memory creation
- Photo uploads
- Chat functionality
- Link sharing

## 🧪 Testing Your Deployment

### Test Backend Endpoints
```bash
# Test health endpoint
curl https://your-deployment-url.com/

# Test memory creation
curl -X POST https://your-deployment-url.com/api/memories \
  -H "Content-Type: application/json" \
  -d '{"type": "text", "content": "Test memory", "title": "Test"}'
```

### Test Frontend Integration
1. Open the app
2. Try creating a text memory
3. Try uploading a photo
4. Try the chat feature
5. Try sharing a link from another app

## 📋 Quick Checklist

### Backend Deployment
- [ ] Google Cloud SDK installed
- [ ] Logged into Google Cloud
- [ ] Created and configured project
- [ ] Set environment variables
- [ ] Deployed backend successfully
- [ ] Copied deployment URL

### Frontend Configuration
- [ ] Updated `API_BASE_URL` in environment.ts
- [ ] Updated `UPLOADS_BASE_PATH` in environment.ts
- [ ] Set `USE_PRODUCTION = true`
- [ ] Tested app with deployed backend
- [ ] Built release APK
- [ ] Tested APK on device

## 🚨 Troubleshooting

### Common Issues

**Backend deployment fails:**
- Check billing is enabled on Google Cloud project
- Verify environment variables are set correctly
- Check Cloud Run logs: `gcloud run services logs read keepr-backend --region us-central1`

**App can't connect to backend:**
- Verify the URL in environment.ts matches your deployment URL exactly
- Check if CORS is configured properly in backend
- Test the backend URL directly in a browser

**APK crashes:**
- Check if `USE_PRODUCTION` is set to true
- Verify all imports are correct after config changes
- Check Metro bundler for any build errors

## 💡 Development vs Production

### For Development (local backend):
```typescript
const USE_PRODUCTION = false; // Uses localhost/10.0.2.2
```

### For Production APK:
```typescript
const USE_PRODUCTION = true; // Uses deployed backend URL
```

## 🎉 Success!

Once complete, your APK will:
- ✅ Connect to your deployed backend on Google Cloud
- ✅ Work on any Android device without needing local backend
- ✅ Handle real user data and interactions
- ✅ Scale automatically with Google Cloud

You can now distribute your APK to users! 🚀 
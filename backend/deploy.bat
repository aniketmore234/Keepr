@echo off
echo.
echo 🚀 Keepr Backend Deployment Script (Windows)
echo ==================================================

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Google Cloud SDK not installed. Please install it first:
    echo https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

REM Check if user is logged in
gcloud auth list --filter=status:ACTIVE --format="value(account)" | findstr /r ".">nul
if %errorlevel% neq 0 (
    echo 🔐 Please login to Google Cloud:
    gcloud auth login
)

REM Get or set project ID
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set PROJECT_ID=%%i
if "%PROJECT_ID%"=="(unset)" set PROJECT_ID=
if "%PROJECT_ID%"=="" (
    echo.
    echo 📝 Please enter your Google Cloud Project ID:
    set /p PROJECT_ID="Project ID: "
    gcloud config set project %PROJECT_ID%
)

echo.
echo 📦 Using project: %PROJECT_ID%

REM Enable required APIs
echo.
echo 🔧 Enabling required APIs...
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

REM Set environment variables reminder
echo.
echo ⚠️  IMPORTANT: Don't forget to set these environment variables in Cloud Run:
echo - GOOGLE_API_KEY
echo - PINECONE_API_KEY
echo - PINECONE_INDEX_NAME
echo - PINECONE_ENVIRONMENT
echo.

REM Choose deployment method
echo 🚀 Choose deployment method:
echo 1) Cloud Run (Recommended - Serverless, pay-per-use)
echo 2) App Engine (Always-on, simpler setup)
set /p DEPLOY_METHOD="Enter choice (1 or 2): "

if "%DEPLOY_METHOD%"=="1" (
    echo.
    echo 🚀 Deploying to Cloud Run...
    gcloud run deploy keepr-backend --source . --platform managed --region us-central1 --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 --max-instances 10
) else if "%DEPLOY_METHOD%"=="2" (
    echo.
    echo 🚀 Deploying to App Engine...
    gcloud app deploy app.yaml --quiet
) else (
    echo ❌ Invalid choice. Exiting.
    pause
    exit /b 1
)

echo.
echo ✅ Deployment complete!
echo.
echo 📝 Next steps:
echo 1. Set environment variables in Google Cloud Console
echo 2. Test your API endpoints
echo 3. Update your SDK endpoint configuration
echo.
pause 
# Windows Setup Instructions - Memory App MVP

A complete guide to set up the Memory App MVP with Vector Database & RAG on Windows.

## 🎯 Quick Overview

This React Native app captures and searches memories using AI-powered metadata extraction, vector embeddings, and RAG (Retrieval Augmented Generation) with Google Gemini AI and Pinecone vector database.

## 📋 Prerequisites

### Required Software

1. **Node.js 18+**
   - Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
   - Verify installation: Open PowerShell and run `node --version`

2. **React Native Development Environment**
   - **For Android**: Android Studio
   - **For iOS**: Xcode (macOS only - skip if Windows only)

3. **Git** (if cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/download/win)

### Android Development Setup (Windows)

1. **Install Android Studio**
   - Download from [developer.android.com](https://developer.android.com/studio)
   - During installation, make sure to install:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device

2. **Configure Environment Variables**
   - Open **System Properties** → **Advanced** → **Environment Variables**
   - Add these system variables:
     ```
     ANDROID_HOME = C:\Users\%USERNAME%\AppData\Local\Android\Sdk
     ```
   - Add to **Path**:
     ```
     %ANDROID_HOME%\platform-tools
     %ANDROID_HOME%\tools
     %ANDROID_HOME%\tools\bin
     ```

3. **Install Java Development Kit (JDK)**
   - Android Studio usually installs this, but if needed:
   - Download JDK 11 or newer from [Oracle](https://www.oracle.com/java/technologies/downloads/) or use OpenJDK

## 🚀 Installation Steps

### Step 1: Clone/Navigate to Project

```powershell
# If cloning from repository:
git clone <your-repo-url>
cd Keepr

# If you already have the project:
cd path\to\your\Keepr\project
```

### Step 2: Install Dependencies

Open **PowerShell** as Administrator (recommended) and run:

```powershell
# Install main project dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd..
```

### Step 3: Get API Keys

#### Google Gemini API Key (Required)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated API key

#### Pinecone API Key (Optional but Recommended)
1. Visit [Pinecone](https://www.pinecone.io/)
2. Sign up for a free account (100GB free tier)
3. Go to your dashboard and copy your API key
4. Note your environment (e.g., "us-east1-aws")

### Step 4: Configure Environment

```powershell
# Navigate to backend directory
cd backend

# Copy the example environment file
copy env.example .env
```

Edit the `.env` file with your text editor (Notepad, VSCode, etc.):

```env
# Google Gemini API Key (REQUIRED)
GOOGLE_API_KEY=your_actual_google_api_key_here

# Pinecone Vector Database Configuration (OPTIONAL)
PINECONE_API_KEY=your_actual_pinecone_api_key_here
PINECONE_INDEX_NAME=memory-app-index
PINECONE_ENVIRONMENT=us-east1-aws

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Step 5: Configure API Base URL

Edit `src/services/ApiService.js` and update the BASE_URL:

For **Android Emulator** (most common):
```javascript
const BASE_URL = 'http://10.0.2.2:3000';
```

For **Physical Android Device**:
```javascript
// Replace with your computer's IP address
const BASE_URL = 'http://192.168.1.XXX:3000';
```

To find your IP address:
```powershell
ipconfig | findstr "IPv4"
```

## 🏃‍♂️ Running the Application

### Method 1: Automated Scripts

```powershell
# Start backend server
npm run backend

# In a new PowerShell window, start React Native
npm run android
```

### Method 2: Manual Steps

**Terminal 1 - Backend Server:**
```powershell
cd backend
npm start
```

Wait for these success messages:
```
✅ Pinecone initialized successfully
🚀 Memory App Backend with Vector Database running on port 3000
📊 Vector DB: Pinecone connected
```

**Terminal 2 - React Native App:**
```powershell
# Make sure you're in the project root
npx react-native start

# In another terminal:
npx @react-native-community/cli run-android
```

## 📱 Android Emulator Setup

### Create Virtual Device

1. Open **Android Studio**
2. Go to **Tools** → **AVD Manager**
3. Click **"Create Virtual Device"**
4. Choose a device (e.g., Pixel 4)
5. Select system image (API 30+ recommended)
6. Click **Finish**
7. Start the emulator by clicking the **Play** button

### Alternative: Use Physical Device

1. Enable **Developer Options** on your Android device:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
   
2. Enable **USB Debugging**:
   - Go to **Settings** → **Developer Options**
   - Turn on **USB Debugging**

3. Connect device via USB
4. Allow USB debugging when prompted

## 🔧 Troubleshooting

### Common Issues

**1. "adb not found" Error**
```powershell
# Add Android SDK platform-tools to PATH
# Or restart your terminal after setting environment variables
```

**2. "ANDROID_HOME not set" Error**
```powershell
# Set environment variable as described in prerequisites
# Restart PowerShell after setting
```

**3. Metro Server Issues**
```powershell
# Clear Metro cache
npx react-native start --reset-cache
```

**4. Build Errors**
```powershell
# Clean build
cd android
./gradlew clean
cd..
```

**5. Backend Connection Issues**
- Check if backend is running on port 3000
- Verify BASE_URL in ApiService.js matches your setup
- For physical devices, ensure your computer and phone are on the same WiFi network

### Network Configuration

**Windows Firewall**: If using physical device, you may need to allow Node.js through Windows Firewall:
1. Go to **Windows Security** → **Firewall & network protection**
2. Click **"Allow an app through firewall"**
3. Add **Node.js** if not already present

## 🎯 Verification Steps

### 1. Backend Health Check
Open browser and visit: `http://localhost:3000/health`

Should return:
```json
{
  "status": "healthy",
  "vectorDB": "connected", 
  "timestamp": "..."
}
```

### 2. App Features Test
- Take a photo and add it as memory
- Add a text note
- Search for memories using natural language
- Verify AI-generated metadata appears

## 📖 Additional Resources

- **React Native Docs**: [reactnative.dev](https://reactnative.dev/docs/environment-setup)
- **Android Studio Setup**: [developer.android.com](https://developer.android.com/studio/install)
- **Troubleshooting Guide**: See main README.md

## 🆘 Getting Help

If you encounter issues:

1. Check the main **README.md** for additional details
2. Verify all prerequisites are installed correctly
3. Ensure API keys are valid and properly set
4. Check that all ports (3000) are available
5. Try restarting both backend and React Native servers

## 🎉 Success!

Once everything is running, you should see:
- Backend server running on `http://localhost:3000`
- React Native app on your Android device/emulator
- Ability to capture and search memories with AI-powered insights

Happy coding! 🚀 
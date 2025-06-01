@echo off
echo 🚀 Setting up Memory App MVP on Windows...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

REM Install main dependencies
echo 📦 Installing main dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install main dependencies
    pause
    exit /b 1
)

REM Check if backend directory exists
if not exist "backend\" (
    echo ❌ Backend directory not found!
    pause
    exit /b 1
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file...
    copy env.example .env
    echo ⚠️  Please edit backend\.env and add your GOOGLE_API_KEY
) else (
    echo ✅ .env file already exists
)

cd..

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Get your Google Gemini API key from: https://makersuite.google.com/app/apikey
echo 2. Edit backend\.env and add your GOOGLE_API_KEY
echo 3. Update the BASE_URL in src\services\ApiService.js if needed
echo 4. Start the backend server: cd backend ^&^& npm start
echo 5. In a new PowerShell window, start React Native: npm run android
echo.
echo For detailed Windows setup instructions, see WINDOWS_SETUP.md
pause 
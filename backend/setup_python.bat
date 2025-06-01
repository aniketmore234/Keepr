@echo off
echo Installing Python dependencies for Instagram processing...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo Python found. Installing dependencies...
echo.

REM Install dependencies
pip install -r requirements.txt

if %errorlevel% equ 0 (
    echo.
    echo ✅ Python dependencies installed successfully!
    echo.
    echo You can now run the server with Instagram support.
) else (
    echo.
    echo ❌ Failed to install Python dependencies.
    echo Please check the error messages above.
)

pause 
@echo off
echo Setting up Python virtual environment for Instagram processing...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo Python found. Setting up virtual environment...
echo.

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created successfully!
) else (
    echo ℹ️ Virtual environment already exists.
)

echo.
echo Activating virtual environment and installing dependencies...

REM Activate virtual environment and install dependencies
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo Installing Python packages...
pip install -r requirements.txt

if %errorlevel% equ 0 (
    echo.
    echo ✅ Python dependencies installed successfully in virtual environment!
    echo.
    echo Virtual environment is ready at: %cd%\venv
    echo.
    echo To manually activate the environment, run:
    echo   venv\Scripts\activate.bat
    echo.
    echo The server will automatically use this environment.
) else (
    echo.
    echo ❌ Failed to install Python dependencies.
    echo Please check the error messages above.
)

deactivate
pause 
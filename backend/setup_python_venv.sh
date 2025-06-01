#!/bin/bash
echo "Setting up Python virtual environment for Instagram processing..."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3"
    exit 1
fi

echo "Python found. Setting up virtual environment..."
echo

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created successfully!"
else
    echo "ℹ️ Virtual environment already exists."
fi

echo
echo "Activating virtual environment and installing dependencies..."

# Activate virtual environment
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to activate virtual environment"
    exit 1
fi

echo "Installing Python packages..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo
    echo "✅ Python dependencies installed successfully in virtual environment!"
    echo
    echo "Virtual environment is ready at: $(pwd)/venv"
    echo
    echo "To manually activate the environment, run:"
    echo "  source venv/bin/activate"
    echo
    echo "The server will automatically use this environment."
else
    echo
    echo "❌ Failed to install Python dependencies."
    echo "Please check the error messages above."
fi

deactivate 
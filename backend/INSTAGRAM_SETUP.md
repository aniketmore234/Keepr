# Instagram Integration Setup

This document explains how to set up Instagram link processing in the Keepr backend.

## Overview

The Instagram integration allows the application to:
- Extract metadata from Instagram posts and reels
- Get captions, hashtags, and usernames
- Process Instagram URLs with rich metadata for better searchability

## Setup Instructions

### 1. Install Python Dependencies (Virtual Environment)

**Recommended**: Use the virtual environment setup scripts to avoid conflicts with system packages:

```bash
# On Windows
cd backend
setup_python_venv.bat

# On Linux/Mac
cd backend
chmod +x setup_python_venv.sh
./setup_python_venv.sh
```

**Alternative**: Manual setup without virtual environment:
```bash
# On Windows
cd backend
setup_python.bat

# On Linux/Mac
cd backend
pip install -r requirements.txt
```

### 2. Verify Installation

Test the Instagram processing:

```bash
cd backend
python test_instagram.py

# Or if using virtual environment manually:
# Windows: venv\Scripts\activate.bat && python test_instagram.py
# Linux/Mac: source venv/bin/activate && python test_instagram.py
```

### 3. Test with Real URLs

To test with real Instagram URLs, you can:

1. Edit `test_instagram.py` and replace the sample URLs with real ones
2. Or use the API directly by starting the server and making a POST request to `/api/memory/link`

## How It Works

### Architecture

1. **Platform Detection**: The Node.js server detects Instagram URLs
2. **Python Processing**: Calls the Python script `instagram_processor.py` using `instaloader`
3. **Virtual Environment**: Automatically uses Python from virtual environment if available
4. **Metadata Extraction**: Returns structured data including:
   - Post title and caption
   - Username and hashtags
   - Post type (post/reel/story)
   - Platform-specific metadata

### API Usage

Send a POST request to `/api/memory/link`:

```json
{
  "url": "https://www.instagram.com/p/EXAMPLE/",
  "title": "Optional title",
  "description": "Optional description"
}
```

The server will automatically detect it's an Instagram URL and use the Python processor.

### Fallback Behavior

If the Python script fails:
- The system falls back to basic URL parsing
- Still extracts username from URL pattern
- Returns minimal but functional metadata

## Files Added

- `instagram_processor.py` - Main Python script for Instagram processing
- `requirements.txt` - Python dependencies
- `setup_python_venv.bat` - Windows virtual environment setup script
- `setup_python_venv.sh` - Linux/Mac virtual environment setup script
- `setup_python.bat` - Legacy Windows setup script (without venv)
- `test_instagram.py` - Test script
- `INSTAGRAM_SETUP.md` - This documentation

## Dependencies

### Python Packages (in virtual environment)
- `instaloader==4.10.3` - For Instagram metadata extraction
- `requests==2.31.0` - For HTTP requests

### Node.js Packages
- No additional packages needed (uses built-in `child_process`)

## Virtual Environment Structure

After setup, your backend directory will contain:
```
backend/
├── venv/                          # Python virtual environment
│   ├── Scripts/ (Windows)         # Python executables
│   ├── bin/ (Linux/Mac)          # Python executables
│   └── lib/                      # Installed packages
├── instagram_processor.py        # Instagram processing script
├── requirements.txt              # Python dependencies
└── ...
```

## Troubleshooting

### Common Issues

1. **Python not found**: Ensure Python is installed and in PATH
2. **Virtual environment creation fails**: Make sure you have `venv` module (comes with Python 3.3+)
3. **Instagram rate limiting**: If making many requests, Instagram may temporarily block access
4. **Private posts**: The processor can only access public Instagram content
5. **Permission denied on setup script**: On Linux/Mac, run `chmod +x setup_python_venv.sh`

### Error Handling

The system includes comprehensive error handling:
- Automatically detects and uses virtual environment Python
- Falls back to system Python if virtual environment not found
- Python script errors return fallback metadata
- Network issues are caught and logged
- Invalid URLs are handled gracefully

### Virtual Environment Benefits

- **Isolation**: Dependencies don't conflict with system packages
- **Reproducibility**: Consistent package versions across environments
- **Clean uninstall**: Simply delete the `venv` folder to remove all dependencies
- **Version control**: `requirements.txt` ensures consistent dependency versions

## Manual Virtual Environment Management

If you need to manually manage the virtual environment:

```bash
# Windows
cd backend
venv\Scripts\activate.bat
pip install -r requirements.txt
deactivate

# Linux/Mac
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

## Future Enhancements

Potential improvements:
- YouTube URL processing (similar to Instagram)
- Twitter/X URL processing
- TikTok URL processing
- Cached results to avoid repeated API calls
- Docker container with pre-configured environment 
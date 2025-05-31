#!/bin/bash

echo "🚀 Setting up Memory App MVP..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install main dependencies
echo "📦 Installing main dependencies..."
npm install

# Create backend directory if it doesn't exist
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found!"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit backend/.env and add your GOOGLE_API_KEY"
else
    echo "✅ .env file already exists"
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Get your Google Gemini API key from: https://makersuite.google.com/app/apikey"
echo "2. Edit backend/.env and add your GOOGLE_API_KEY"
echo "3. Update the BASE_URL in src/services/ApiService.js if needed"
echo "4. Start the backend server: cd backend && npm start"
echo "5. In a new terminal, start the React Native app: npm run android (or npm run ios)"
echo ""
echo "For detailed instructions, see README.md" 
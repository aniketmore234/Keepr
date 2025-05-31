# Memory App MVP with Vector Database & RAG

A React Native mobile app that allows you to capture and search memories using AI-powered metadata extraction, vector embeddings, and RAG (Retrieval Augmented Generation). Built with Google Gemini AI and Pinecone vector database for production-grade semantic search.

## 🚀 New: Vector Database + RAG Integration

### What's Upgraded?
- **Production Vector Database**: Pinecone for scalable semantic search
- **Proper Embeddings**: Google's 768-dimensional embedding model
- **RAG Enhancement**: AI-generated search insights and suggestions
- **Semantic Understanding**: Find memories by meaning, not just keywords
- **Smart Fallback**: In-memory storage if vector DB unavailable

### RAG Search Benefits
- **Context-Aware Results**: AI analyzes your search and provides insights
- **Related Queries**: Suggestions for similar searches
- **Content Summaries**: Overview of found content
- **Suggested Filters**: Smart categorization recommendations

## Features

### 📸 Memory Capture
- **Photos/Screenshots**: Take pictures or select from gallery with AI-powered image analysis
- **Text Notes**: Write and save text notes with automatic keyword extraction
- **Links**: Save web pages, videos, and articles with metadata extraction

### 🔍 AI-Powered Vector Search
- **Natural Language Search**: Search using conversational queries like "photos from last week" or "notes about work"
- **Vector Similarity**: Semantic matching using 768-dimensional embeddings
- **RAG Enhancement**: AI-generated insights, summaries, and suggestions
- **Smart Metadata**: Automatic extraction of objects, scenes, colors, mood, and keywords

### 🤖 Google Gemini + Pinecone Integration
- **Image Analysis**: Detailed analysis of photos including object detection and scene description
- **Content Understanding**: Smart extraction of metadata from text and links
- **Vector Embeddings**: Google's embedding-001 model for semantic search
- **Scalable Storage**: Pinecone vector database for production workloads

## Tech Stack

- **Frontend**: React Native 0.73.0
- **Backend**: Node.js with Express
- **AI**: Google Gemini 1.5 Flash + embedding-001
- **Vector DB**: Pinecone (with in-memory fallback)
- **UI**: React Native Paper (Material Design)
- **Navigation**: React Navigation 6
- **Image Handling**: React Native Image Picker

## Prerequisites

- Node.js 18+ 
- React Native development environment
- Android Studio (for Android) or Xcode (for iOS)
- **Google API key** for Gemini (required)
- **Pinecone API key** for vector database (optional but recommended)

## Quick Setup

### Option 1: Full Setup with Vector Database
```bash
# 1. Run automated setup
./setup.sh

# 2. Get API keys:
# - Google Gemini: https://makersuite.google.com/app/apikey
# - Pinecone: https://app.pinecone.io/ (free tier available)

# 3. Configure environment
cd backend
cp env.example .env
# Edit .env with your API keys

# 4. Start backend
npm start

# 5. Start React Native app
cd ..
npm run android  # or npm run ios
```

### Option 2: Quick Test (In-Memory Only)
```bash
# Just add Google API key - Pinecone is optional
# App will fall back to in-memory storage
cd backend
echo "GOOGLE_API_KEY=your_key_here" > .env
npm start
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install main dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Get API Keys

#### Google Gemini (Required)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

#### Pinecone (Recommended)
1. Go to [Pinecone](https://www.pinecone.io/)
2. Sign up for free account (100GB free!)
3. Get your API key from console
4. Note your environment name

### 3. Configure Environment

```bash
cd backend
cp env.example .env
```

Edit `.env`:
```bash
# Required
GOOGLE_API_KEY=your_google_gemini_api_key_here

# Optional (for production vector database)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-west1-gcp-free
PINECONE_INDEX_NAME=memory-app-index

# Server config
PORT=3000
NODE_ENV=development
```

### 4. Configure API Base URL

Edit `src/services/ApiService.js` and update the BASE_URL:

```javascript
// For Android Emulator
const BASE_URL = 'http://10.0.2.2:3000';

// For iOS Simulator  
const BASE_URL = 'http://localhost:3000';

// For Physical Device (replace with your computer's IP)
const BASE_URL = 'http://192.168.1.100:3000';
```

### 5. Start the Backend Server

```bash
cd backend
npm start
```

Look for these success messages:
```
✅ Pinecone initialized successfully
🚀 Memory App Backend with Vector Database running on port 3000
📊 Vector DB: Pinecone connected
```

### 6. Start the React Native App

```bash
# For Android
npm run android

# For iOS
npm run ios
```

## Vector Database Setup

For detailed Pinecone setup instructions, see [PINECONE_SETUP.md](./PINECONE_SETUP.md).

### Quick Pinecone Setup
1. Sign up at [pinecone.io](https://www.pinecone.io/)
2. Get API key from console
3. Add to `backend/.env`
4. Restart backend - index auto-created!

### Fallback Behavior
- **With Pinecone**: Production-grade vector search
- **Without Pinecone**: In-memory storage (data resets on restart)
- **Seamless Switch**: Add Pinecone key anytime to upgrade

## Usage Guide

### Adding Memories

1. **Take Photo**: Tap the camera icon to take a new photo or select from gallery
2. **Add Text Note**: Tap the text icon to write notes, thoughts, or important information
3. **Save Link**: Tap the link icon to save web pages, videos, or articles

All memories are automatically:
- Analyzed by AI for comprehensive metadata
- Converted to vector embeddings
- Stored in vector database for semantic search

### Searching with RAG

1. Open the search screen from the home page
2. Type natural language queries like:
   - "photos from last week"
   - "notes about meetings"
   - "links about technology"
   - "memories with friends"
   - "important documents"
   - "vacation photos"

3. Get enhanced results with:
   - **AI Insights**: Analysis of what was found
   - **Related Queries**: Suggestions for similar searches
   - **Content Summary**: Overview of results
   - **Suggested Filters**: Smart categorization

### Viewing Memory Details

- Tap any memory card to see full details
- View comprehensive AI-generated metadata:
  - Object detection (for images)
  - Scene analysis and mood
  - Keywords, topics, entities
  - Importance levels and categories
  - Activities and time context

## API Endpoints

### Memory Management
- `POST /api/memory/image` - Add image memory with AI analysis
- `POST /api/memory/text` - Add text memory with NLP processing
- `POST /api/memory/link` - Add link memory with content analysis
- `GET /api/memories` - Get all memories
- `GET /api/memory/:id` - Get memory by ID
- `DELETE /api/memory/:id` - Delete memory

### Enhanced Search
- `POST /api/search` - RAG-enhanced semantic search with insights

### Health Check
- `GET /health` - Server health check with vector DB status

## Architecture

### Vector Search Flow
```
1. Memory Input → AI Analysis → Embedding Generation → Vector Storage
2. Search Query → Query Embedding → Vector Similarity → RAG Enhancement → Results + Insights
```

### AI Processing Pipeline
- **Image**: Gemini Vision → Objects, Scene, Mood, Colors, Text → Vector Embedding
- **Text**: Gemini NLP → Keywords, Topics, Entities, Sentiment → Vector Embedding  
- **Link**: Gemini Analysis → Content Type, Category, Platform → Vector Embedding

### Storage Architecture
- **Vector Database**: Pinecone (768-dimensional embeddings)
- **Metadata**: Minimal storage in Pinecone metadata
- **Files**: Local filesystem (images)
- **Fallback**: In-memory vectors if Pinecone unavailable

## Features in Detail

### Enhanced AI Analysis

#### Images
- Comprehensive object detection
- Scene and location type analysis
- Mood and emotional context
- Color analysis and composition
- Text extraction (OCR-free)
- People counting and activities
- Photo style classification
- Quality scoring

#### Text Content  
- Keyword and topic extraction
- Named entity recognition (people, places, organizations)
- Sentiment and mood analysis
- Importance scoring (1-10)
- Category classification
- Action item detection
- Date/time extraction
- Urgency assessment

#### Links & URLs
- Content type classification
- Platform identification
- Category and audience analysis
- Reading time estimation
- Content quality scoring
- Tag generation

### RAG Search Enhancement

After vector similarity search, the system:
1. **Analyzes Context**: Reviews found memories for patterns
2. **Generates Insights**: Provides AI analysis of search results
3. **Suggests Queries**: Recommends related searches
4. **Summarizes Content**: Creates overview of found information
5. **Offers Filters**: Suggests relevant categories

## Limitations & Future Improvements

### Current Limitations
- Image storage in local filesystem (not cloud)
- Basic React Native UI (can be enhanced)
- Simple authentication (none implemented)
- Single-user system

### Planned Improvements
- **Cloud Storage**: S3/Firebase for images
- **User Authentication**: Firebase Auth or Supabase
- **Advanced UI**: More sophisticated design
- **Social Features**: Sharing and collaboration
- **Export Functions**: Backup and data export
- **Advanced Analytics**: Usage patterns and insights

## Troubleshooting

### Common Issues

1. **Vector Database Connection Failed**
   - Check Pinecone API key in `.env`
   - Verify environment and index name
   - App automatically falls back to in-memory storage

2. **Google API Errors**
   - Verify API key is correct in `.env`
   - Check API quotas in Google Cloud Console
   - Ensure Gemini API is enabled

3. **Search Not Working**
   - Check backend server is running
   - Verify network connectivity
   - Test health endpoint: `curl http://localhost:3000/health`

4. **No Memories Found**
   - Add some test memories first
   - Check if vector database is properly connected
   - Try simpler search queries

### Debug Information

Check health endpoint for status:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Memory App Backend with Vector Database is running",
  "vectorDB": "Pinecone connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Cost & Scaling

### Free Tier Usage
- **Google Gemini**: Generous free tier
- **Pinecone**: 100GB storage (1M+ memories)
- **React Native**: Free and open source

### Production Costs
- **Pinecone Starter**: $70/month for production
- **Google Cloud**: Pay per API call
- **Hosting**: Variable based on deployment

## Alternative Configurations

### Other Vector Databases
- **Weaviate**: Open source alternative
- **Chroma**: Local vector database
- **Supabase**: PostgreSQL with vector extension
- **Redis**: With vector similarity search

### Other LLM Providers
- **OpenAI**: GPT-4 with embeddings
- **Anthropic**: Claude with custom embeddings
- **Local**: Ollama with local models

## Contributing

This is a comprehensive example of modern AI app architecture. Feel free to:
- Add new memory types
- Improve the UI/UX
- Enhance the search algorithm
- Add user authentication
- Implement cloud storage
- Create better analytics

## License

This project is for educational and demonstration purposes. Feel free to use and modify as needed.

---

## Quick Start Summary

1. **Get API Keys**: Google Gemini (required) + Pinecone (optional)
2. **Run Setup**: `./setup.sh`
3. **Configure**: Edit `backend/.env` with your API keys
4. **Start Backend**: `cd backend && npm start`
5. **Start App**: `npm run android` or `npm run ios`
6. **Test**: Add memories and try semantic search!

**Enjoy building with AI! 🤖✨** 
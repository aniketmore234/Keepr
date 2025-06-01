import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Temporarily allow self-signed certificates for Pinecone connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// Initialize Pinecone
let pinecone;
let index;


async function initializePinecone() {
  try {
    // Check if required environment variables are set
    if (!process.env.PINECONE_API_KEY) {
      console.log('⚠️ Pinecone API key not set. Using in-memory storage.');
      console.log(`   - PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? 'SET' : 'NOT SET'}`);
      console.log(`   - PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME ? 'SET' : 'NOT SET'}`);
      return;
    }

    console.log('🔌 Connecting to Pinecone...');
    console.log(`   - Index Name: ${process.env.PINECONE_INDEX_NAME}`);
    console.log(`   - API Key: ${process.env.PINECONE_API_KEY.substring(0, 10)}...`);

    console.log('🏗️ Creating Pinecone client...');
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    console.log('✅ Pinecone client initialized successfully');

    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!indexName) {
      console.log('❌ PINECONE_INDEX_NAME missing in environment variables');
      console.log('⚠️ Falling back to in-memory storage');
      return;
    }

    console.log(`🔗 Connecting to index "${indexName}"...`);
    // Use direct host for the index based on our testing
    const indexHost = process.env.PINECONE_INDEX_HOST;
    index = pinecone.index(indexName, indexHost);
    console.log('✅ Pinecone index connection established!');

    console.log('📊 Getting index stats...');
    const stats = await index.describeIndexStats();
    console.log(`✅ Connected to Pinecone index "${indexName}" with ${stats.totalVectorCount || 0} vectors, ${stats.dimension} dimensions.`);
    
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone - DETAILED ERROR:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.log('⚠️ Falling back to in-memory storage');
  }
}

// Initialize Pinecone on startup
initializePinecone();

// Helper function to clean Gemini responses for JSON parsing
function cleanGeminiResponse(responseText) {
  try {
    console.log('🔍 Raw response first 200 chars:', responseText.substring(0, 200));
    
    // Remove markdown code blocks
    responseText = responseText.replace(/```json|```/g, '');
    
    // Remove asterisks used for markdown emphasis
    responseText = responseText.replace(/\*\*/g, ''); // Remove **bold**
    responseText = responseText.replace(/\*/g, ''); // Remove *italic*
    
    // Remove other markdown formatting
    responseText = responseText.replace(/#+\s*/g, ''); // Remove headers
    responseText = responseText.replace(/^-\s*/gm, ''); // Remove list items
    responseText = responseText.replace(/_{2,}/g, ''); // Remove underscores
    
    // Find the JSON object in the response
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }
    
    console.log('🧹 Cleaned response first 200 chars:', responseText.substring(0, 200));
    
    return responseText.trim();
  } catch (error) {
    console.error('Error cleaning response:', error);
    return responseText;
  }
}

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// In-memory fallback storage
let memoryStore = [];

// In-memory storage for the simplified API
let memories = [];

// Chatbot conversation storage
let conversations = {};
const CONVERSATIONS_FILE = path.join(__dirname, 'conversations.json');
const MAX_CONTEXT_MESSAGES = 10; // Keep last 10 messages for context

// Load conversations from file on startup
function loadConversations() {
  try {
    if (fs.existsSync(CONVERSATIONS_FILE)) {
      const data = fs.readFileSync(CONVERSATIONS_FILE, 'utf8');
      conversations = JSON.parse(data);
      console.log(`📁 Loaded ${Object.keys(conversations).length} conversations from file`);
    }
  } catch (error) {
    console.error('❌ Error loading conversations:', error);
    conversations = {};
  }
}

// Save conversations to file
function saveConversations() {
  try {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
    console.log(`💾 Saved ${Object.keys(conversations).length} conversations to file`);
  } catch (error) {
    console.error('❌ Error saving conversations:', error);
  }
}

// Clean up old conversations (older than 24 hours)
function cleanupOldConversations() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  Object.keys(conversations).forEach(sessionId => {
    const conversation = conversations[sessionId];
    if (new Date(conversation.lastActivity) < cutoff) {
      delete conversations[sessionId];
    }
  });
}

// Initialize conversations on startup
loadConversations();
setInterval(saveConversations, 30000); // Save every 30 seconds
setInterval(cleanupOldConversations, 60000); // Cleanup every minute

// Helper function to generate proper embeddings using Google's embedding model
async function generateEmbedding(text) {
  try {
    console.log('🤖 GOOGLE API: Attempting to generate embedding via Google API...');
    console.log(`📝 Input text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    console.log(`📏 Text length: ${text.length} characters`);
    
    const result = await embeddingModel.embedContent(text);
    
    console.log('✅ GOOGLE API: Successfully generated embedding via Google API');
    console.log(`📊 Embedding details:`);
    console.log(`   - Dimension: ${result.embedding.values.length}`);
    console.log(`   - Sample values: [${result.embedding.values.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`   - Data type: ${typeof result.embedding.values[0]}`);
    console.log(`   - Min value: ${Math.min(...result.embedding.values).toFixed(4)}`);
    console.log(`   - Max value: ${Math.max(...result.embedding.values).toFixed(4)}`);
    
    // Normalize the embedding vector for better similarity calculations (like MemoryApp)
    const embedding = result.embedding.values;
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map(val => val / magnitude);
    
    console.log(`🔧 Vector normalized. Magnitude: ${magnitude.toFixed(4)}`);
    console.log(`📊 Normalized sample: [${normalizedEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    
    return normalizedEmbedding;
  } catch (error) {
    console.error('❌ GOOGLE API: Error generating embedding:', error.message);
    console.log('⚠️ FALLBACK: Using simple hash-based embedding instead');
    // Fallback to simple hash-based embedding (768 dimensions)
    return generateSimpleEmbedding(text);
  }
}

// Fallback simple embedding function
function generateSimpleEmbedding(text) {
  const embedding = new Array(768).fill(0); // Back to 768 dimensions
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = charCode % 768; // Back to 768 dimensions
    embedding[index] += 1;
  }
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Enhanced metadata extraction using Gemini
async function extractImageMetadata(imagePath) {
  try {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    const prompt = `Analyze this image comprehensively and extract detailed metadata in JSON format:
    {
      "title": "A concise, descriptive title",
      "description": "Detailed description of the image content",
      "objects": ["list", "of", "objects", "detected"],
      "scene": "Description of the scene/setting",
      "colors": ["dominant", "colors"],
      "mood": "emotional mood/atmosphere",
      "activities": ["activities", "or", "actions", "happening"],
      "location_type": "indoor/outdoor/nature/urban etc",
      "time_of_day": "morning/afternoon/evening/night",
      "style": "photo style (portrait/landscape/macro etc)",
      "tags": ["comprehensive", "list", "of", "tags"],
      "text_content": "any text visible in the image",
      "people_count": 0,
      "is_document": false,
      "quality_score": 8.5
    }`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const responseText = cleanGeminiResponse(response.text());
    const metadata = JSON.parse(responseText);
    return metadata;
  } catch (error) {
    console.error('Error extracting image metadata:', error);
    return {
      title: 'Image',
      description: 'Unable to analyze image',
      objects: [],
      scene: 'Unknown',
      colors: [],
      mood: 'neutral',
      activities: [],
      location_type: 'unknown',
      time_of_day: 'unknown',
      style: 'photo',
      tags: [],
      text_content: '',
      people_count: 0,
      is_document: false,
      quality_score: 5.0
    };
  }
}

// Platform detection function
function detectPlatform(url) {
  try {
    console.log(`🔍 Detecting platform for URL: ${url}`);
    const urlLower = url.toLowerCase();
    console.log(`🔍 URL lowercase: ${urlLower}`);
    
    if (urlLower.includes('instagram.com')) {
      console.log('✅ Detected Instagram platform');
      return 'instagram';
    } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      console.log('✅ Detected YouTube platform');
      return 'youtube';
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      console.log('✅ Detected Twitter/X platform');
      return 'twitter';
    } else if (urlLower.includes('tiktok.com')) {
      console.log('✅ Detected TikTok platform');
      return 'tiktok';
    } else if (urlLower.includes('linkedin.com')) {
      console.log('✅ Detected LinkedIn platform');
      return 'linkedin';
    } else {
      console.log('ℹ️ No specific platform detected, using generic');
      return 'generic';
    }
  } catch (error) {
    console.error('❌ Error detecting platform:', error);
    return 'generic';
  }
}

// Instagram metadata extraction using Python script
async function extractInstagramMetadata(url) {
  return new Promise((resolve, reject) => {
    console.log('📱 Processing Instagram URL with Python script...');
    
    const pythonScript = path.join(__dirname, 'instagram_processor.py');
    
    // Determine Python executable path - prefer virtual environment
    let pythonExecutable = 'python';
    const venvPythonWin = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
    const venvPythonUnix = path.join(__dirname, 'venv', 'bin', 'python');
    
    if (fs.existsSync(venvPythonWin)) {
      pythonExecutable = venvPythonWin;
      console.log('🐍 Using Python from Windows virtual environment');
    } else if (fs.existsSync(venvPythonUnix)) {
      pythonExecutable = venvPythonUnix;
      console.log('🐍 Using Python from Unix virtual environment');
    } else {
      console.log('⚠️ Virtual environment not found, using system Python');
      console.log('   Consider running setup_python_venv.bat (Windows) or setup_python_venv.sh (Linux/Mac)');
    }
    
    const pythonProcess = spawn(pythonExecutable, [pythonScript, url]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          console.log('✅ Successfully extracted Instagram metadata');
          
          // Add timestamp information
          const now = new Date();
          result.created_at = now.toISOString();
          result.date_readable = now.toLocaleDateString();
          result.time_readable = now.toLocaleTimeString();
          result.day_of_week = now.toLocaleDateString('en-US', { weekday: 'long' });
          result.month_year = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          result.timestamp_searchable = `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
          
          resolve(result);
        } catch (parseError) {
          console.error('❌ Error parsing Instagram metadata JSON:', parseError);
          console.log('Raw stdout:', stdout);
          reject(new Error('Failed to parse Instagram metadata'));
        }
      } else {
        console.error('❌ Python script failed with code:', code);
        console.error('❌ stderr:', stderr);
        
        // Return fallback data
        const now = new Date();
        const fallbackData = {
          success: false,
          platform: "instagram",
          url: url,
          title: "Instagram Content",
          description: "Instagram content (metadata extraction failed)",
          domain: "instagram.com",
          type: "social",
          category: "social_media",
          tags: ["instagram"],
          estimated_read_time: "1-2 minutes",
          content_type: "instagram_content",
          target_audience: "general",
          relevance_score: 5.0,
          created_at: now.toISOString(),
          date_readable: now.toLocaleDateString(),
          time_readable: now.toLocaleTimeString(),
          day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
          month_year: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          timestamp_searchable: `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
          error: "Python script execution failed"
        };
        resolve(fallbackData);
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Error spawning Python process:', error);
      console.log('💡 Suggestion: Run setup_python_venv.bat (Windows) or setup_python_venv.sh (Linux/Mac) to set up the virtual environment');
      
      // Return fallback data
      const now = new Date();
      const fallbackData = {
        success: false,
        platform: "instagram",
        url: url,
        title: "Instagram Content",
        description: "Instagram content (Python unavailable)",
        domain: "instagram.com",
        type: "social",
        category: "social_media", 
        tags: ["instagram"],
        estimated_read_time: "1-2 minutes",
        content_type: "instagram_content",
        target_audience: "general",
        relevance_score: 5.0,
        created_at: now.toISOString(),
        date_readable: now.toLocaleDateString(),
        time_readable: now.toLocaleTimeString(),
        day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
        month_year: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        timestamp_searchable: `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
        error: "Python not available"
      };
      resolve(fallbackData);
    });
  });
}

// Enhanced text analysis
async function analyzeTextContent(content, title = '') {
  try {
    const now = new Date();
    const prompt = `Analyze this text content and extract comprehensive metadata in JSON format:
    Title: "${title}"
    Content: "${content}"
    Current Date/Time: ${now.toISOString()}
    
    Provide:
    {
      "title": "improved title if needed",
      "summary": "concise summary",
      "keywords": ["key", "words"],
      "topics": ["main", "topics"],
      "entities": ["people", "places", "organizations"],
      "sentiment": "positive/negative/neutral",
      "mood": "emotional tone",
      "importance_level": 1-10,
      "category": "work/personal/study/health etc",
      "action_items": ["any", "tasks", "mentioned"],
      "dates_mentioned": ["any", "dates"],
      "urgency": "high/medium/low",
      "tags": ["comprehensive", "tags"],
      "created_at": "${now.toISOString()}",
      "date_readable": "${now.toLocaleDateString()}",
      "time_readable": "${now.toLocaleTimeString()}",
      "day_of_week": "${now.toLocaleDateString('en-US', { weekday: 'long' })}",
      "month_year": "${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}",
      "timestamp_searchable": "${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}"
    }`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = cleanGeminiResponse(response.text());
    const metadata = JSON.parse(responseText);
    return metadata;
  } catch (error) {
    console.error('Error analyzing text:', error);
    const now = new Date();
    return {
      title: title || 'Note',
      summary: content.substring(0, 100),
      keywords: [],
      topics: [],
      entities: [],
      sentiment: 'neutral',
      mood: 'neutral',
      importance_level: 5,
      category: 'personal',
      action_items: [],
      dates_mentioned: [],
      urgency: 'medium',
      tags: [],
      created_at: now.toISOString(),
      date_readable: now.toLocaleDateString(),
      time_readable: now.toLocaleTimeString(),
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
      month_year: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      timestamp_searchable: `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    };
  }
}

// Enhanced URL analysis with platform-specific processing
async function analyzeUrlContent(url, title = '', description = '') {
  try {
    console.log(`🔍 Analyzing URL: ${url}`);
    console.log(`📝 Title: "${title}"`);
    console.log(`📝 Description: "${description}"`);
    
    // Detect platform
    const platform = detectPlatform(url);
    console.log(`📱 Detected platform: ${platform}`);
    
    // Use platform-specific processing
    if (platform === 'instagram') {
      console.log('🟢 Using Instagram-specific processing...');
      const instagramResult = await extractInstagramMetadata(url);
      console.log('📊 Instagram processing result:', JSON.stringify(instagramResult, null, 2));
      return instagramResult;
    }
    
    // For other platforms, use the existing Gemini analysis
    console.log(`🤖 GOOGLE API: Using Gemini analysis for ${platform} platform...`);
    const now = new Date();
    const prompt = `Analyze this URL and any provided context to extract metadata in JSON format:
    URL: "${url}"
    Title: "${title}"
    Description: "${description}"
    Current Date/Time: ${now.toISOString()}
    
    Provide:
    {
      "title": "improved title (never empty)",
      "description": "enhanced description (never empty)", 
      "domain": "domain name (never empty)",
      "type": "video/article/social/news/documentation etc (never empty)",
      "category": "technology/entertainment/news/education etc (never empty)",
      "platform": "youtube/twitter/github etc (never empty)",
      "tags": ["relevant", "tags", "at least one"],
      "estimated_read_time": "5 minutes (never null)",
      "content_type": "tutorial/entertainment/news etc (never empty)",
      "target_audience": "general/technical/academic etc (never empty)",
      "relevance_score": 8.5,
      "created_at": "${now.toISOString()}",
      "date_readable": "${now.toLocaleDateString()}",
      "time_readable": "${now.toLocaleTimeString()}",
      "day_of_week": "${now.toLocaleDateString('en-US', { weekday: 'long' })}",
      "month_year": "${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}",
      "timestamp_searchable": "${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}"
    }
    
    IMPORTANT: Never return null, undefined, or empty string values. Always provide meaningful content for each field.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log('✅ GOOGLE API: Successfully analyzed URL via Google Gemini');
    
    // Clean the response text more thoroughly
    let responseText = response.text();
    responseText = cleanGeminiResponse(responseText);
    
    let metadata;
    try {
      metadata = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response, using fallback');
      throw new Error('Invalid JSON response from Gemini');
    }
    
    // Validate and provide fallbacks for critical fields
    const urlObj = new URL(url);
    const cleanMetadata = {
      title: metadata.title || title || `Content from ${urlObj.hostname}`,
      description: metadata.description || description || `Link content from ${urlObj.hostname}`,
      domain: metadata.domain || urlObj.hostname,
      type: metadata.type || 'link',
      category: metadata.category || 'general',
      platform: metadata.platform || urlObj.hostname.replace('www.', ''),
      tags: Array.isArray(metadata.tags) && metadata.tags.length > 0 ? metadata.tags : ['link'],
      estimated_read_time: metadata.estimated_read_time || '5 minutes',
      content_type: metadata.content_type || 'general',
      target_audience: metadata.target_audience || 'general',
      relevance_score: typeof metadata.relevance_score === 'number' ? metadata.relevance_score : 5.0,
      created_at: metadata.created_at || now.toISOString(),
      date_readable: metadata.date_readable || now.toLocaleDateString(),
      time_readable: metadata.time_readable || now.toLocaleTimeString(),
      day_of_week: metadata.day_of_week || now.toLocaleDateString('en-US', { weekday: 'long' }),
      month_year: metadata.month_year || now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      timestamp_searchable: metadata.timestamp_searchable || `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    };
    
    return cleanMetadata;
  } catch (error) {
    console.error('❌ GOOGLE API: Error analyzing URL:', error.message);
    console.log('⚠️ FALLBACK: Using basic URL metadata instead');
    const now = new Date();
    const urlObj = new URL(url);
    
    return {
      title: title || `Content from ${urlObj.hostname}`,
      description: description || `Link content from ${urlObj.hostname}`,
      domain: urlObj.hostname,
      type: 'link',
      category: 'general',
      platform: urlObj.hostname.replace('www.', ''),
      tags: ['link'],
      estimated_read_time: '5 minutes',
      content_type: 'general',
      target_audience: 'general',
      relevance_score: 5.0,
      created_at: now.toISOString(),
      date_readable: now.toLocaleDateString(),
      time_readable: now.toLocaleTimeString(),
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
      month_year: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      timestamp_searchable: `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    };
  }
}

// Store memory in vector database
async function storeMemoryVector(memory) {
  if (!index) {
    // Fallback to in-memory storage
    memoryStore.push(memory);
    return;
  }

  try {
    // Build metadata object, only including fields with actual values (not null, undefined, or empty strings)
    const metadata = {
      type: memory.type,
      title: memory.title || memory.metadata?.title || '',
      createdAt: memory.createdAt,
      // Store user-friendly content instead of combinedText for better AI understanding
      content: memory.type === 'link' 
        ? (memory.metadata?.ai_summary || memory.metadata?.description || memory.metadata?.caption || memory.url)
        : (memory.type === 'image' 
          ? (memory.metadata?.description || memory.metadata?.title || 'Image content')
          : (memory.content || memory.metadata?.summary || 'Text content')),
      // Keep combinedText for embedding search context but separate from content
      searchableText: memory.combinedText,
      category: memory.metadata?.category || memory.metadata?.type || 'general',
      importance: memory.metadata?.importance_level || memory.metadata?.relevance_score || 5
    };

    console.log(`🔍 DEBUG - Storing memory ${memory.id}:`);
    console.log(`   Type: ${memory.type}`);
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Content (for AI): ${metadata.content?.substring(0, 150)}${metadata.content?.length > 150 ? '...' : ''}`);
    console.log(`   SearchableText (for embedding): ${metadata.searchableText?.substring(0, 100)}${metadata.searchableText?.length > 100 ? '...' : ''}`);
    if (memory.metadata?.ai_summary) {
      console.log(`   AI Summary: ${memory.metadata.ai_summary.substring(0, 100)}${memory.metadata.ai_summary.length > 100 ? '...' : ''}`);
    }

    // Helper function to safely add metadata fields (excluding null, undefined, and empty values)
    const addMetadataField = (fieldName, value) => {
      if (value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined') {
        // Convert arrays to comma-separated strings for Pinecone
        if (Array.isArray(value)) {
          const cleanArray = value.filter(item => item !== null && item !== undefined && item !== '');
          if (cleanArray.length > 0) {
            metadata[fieldName] = cleanArray.join(', ');
          }
        } else {
          metadata[fieldName] = value;
        }
      }
    };

    // Add optional fields only if they have valid values
    addMetadataField('fileName', memory.fileName);
    addMetadataField('url', memory.url);
    addMetadataField('description', memory.description || memory.metadata?.description);
    
    // Add metadata from analysis
    if (memory.metadata) {
      addMetadataField('objects', memory.metadata.objects);
      addMetadataField('scene', memory.metadata.scene);
      addMetadataField('tags', memory.metadata.tags);
      addMetadataField('platform', memory.metadata.platform);
      addMetadataField('content_type', memory.metadata.content_type);
      addMetadataField('estimated_read_time', memory.metadata.estimated_read_time);
      addMetadataField('target_audience', memory.metadata.target_audience);
      addMetadataField('domain', memory.metadata.domain);
      addMetadataField('mood', memory.metadata.mood);
      addMetadataField('sentiment', memory.metadata.sentiment);
      addMetadataField('urgency', memory.metadata.urgency);
      addMetadataField('keywords', memory.metadata.keywords);
      addMetadataField('topics', memory.metadata.topics);
      addMetadataField('entities', memory.metadata.entities);
      addMetadataField('action_items', memory.metadata.action_items);
      addMetadataField('username', memory.metadata.username);
      addMetadataField('hashtags', memory.metadata.hashtags);
      addMetadataField('post_type', memory.metadata.post_type);
      addMetadataField('caption', memory.metadata.caption);
      addMetadataField('ai_summary', memory.metadata.ai_summary); // Add AI summary for link memories
      
      // Handle numeric fields with validation
      if (typeof memory.metadata.relevance_score === 'number' && !isNaN(memory.metadata.relevance_score)) {
        metadata.relevance_score = memory.metadata.relevance_score;
      }
      if (typeof memory.metadata.importance_level === 'number' && !isNaN(memory.metadata.importance_level)) {
        metadata.importance_level = memory.metadata.importance_level;
      }
      if (typeof memory.metadata.quality_score === 'number' && !isNaN(memory.metadata.quality_score)) {
        metadata.quality_score = memory.metadata.quality_score;
      }
      if (typeof memory.metadata.people_count === 'number' && !isNaN(memory.metadata.people_count)) {
        metadata.people_count = memory.metadata.people_count;
      }
      
      // Handle boolean fields
      if (typeof memory.metadata.is_document === 'boolean') {
        metadata.is_document = memory.metadata.is_document;
      }
      if (typeof memory.metadata.success === 'boolean') {
        metadata.success = memory.metadata.success;
      }
    }

    const vector = {
      id: memory.id,
      values: memory.embedding,
      metadata: metadata
    };

    console.log(`📊 Storing vector with ${Object.keys(metadata).length} metadata fields:`, Object.keys(metadata));

    await index.upsert([vector]);
    console.log(`✅ Stored memory ${memory.id} in Pinecone`);
  } catch (error) {
    console.error('❌ Error storing in Pinecone:', error);
    console.error('❌ Memory metadata that caused error:', JSON.stringify(memory.metadata, null, 2));
    // Fallback to in-memory
    memoryStore.push(memory);
  }
}

// RAG-enhanced search
async function performRAGSearch(query, limit = 10) {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    // Define relevance threshold - now unified at 0.6 for all memory types
    const BASE_RELEVANCE_THRESHOLD = 0.6; // For text and image memories
    const LINK_RELEVANCE_THRESHOLD = 0.6;  // For link memories (now same as base)
    let searchResults = [];

    if (index) {
      // Search in Pinecone
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK: limit * 2, // Search more candidates to allow for filtering
        includeMetadata: true,
        includeValues: false
      });

      console.log(`🔍 Search found ${searchResponse.matches.length} potential matches`);
      
      // Apply different thresholds based on memory type
      searchResults = searchResponse.matches
        .filter(match => {
          const memoryType = match.metadata?.type;
          const threshold = memoryType === 'link' ? LINK_RELEVANCE_THRESHOLD : BASE_RELEVANCE_THRESHOLD;
          const isRelevant = match.score >= threshold;
          
          console.log(`📊 Search result ${match.id}: Type="${memoryType}", Score=${match.score.toFixed(3)}, Threshold=${threshold}, Relevant=${isRelevant}`);
          console.log(`    Title: "${match.metadata?.title || 'No title'}"`);
          console.log(`    Content: "${(match.metadata?.content || 'No content').substring(0, 100)}${(match.metadata?.content?.length || 0) > 100 ? '...' : ''}"`);
          if (memoryType === 'link') {
            console.log(`    URL: "${match.metadata?.url || 'No URL'}"`);
            console.log(`    Platform: "${match.metadata?.platform || 'No platform'}"`);
            console.log(`    AI Summary: "${(match.metadata?.ai_summary || 'No AI summary').substring(0, 80)}${(match.metadata?.ai_summary?.length || 0) > 80 ? '...' : ''}"`);
            if (!isRelevant) {
              console.log(`❌ Link memory filtered out from search: "${match.metadata?.title || 'Untitled'}" (${match.score.toFixed(3)} < ${threshold})`);
            }
          }
          
          return isRelevant;
        })
        .map(match => ({
          id: match.id,
          score: match.score,
          type: match.metadata?.type,
          title: match.metadata?.title,
          content: match.metadata?.content,
          url: match.metadata?.url,
          description: match.metadata?.description,
          createdAt: match.metadata?.createdAt,
          objects: match.metadata?.objects,
          scene: match.metadata?.scene,
          tags: match.metadata?.tags,
          category: match.metadata?.category,
          platform: match.metadata?.platform,
          imagePath: match.metadata?.type === 'image' ? match.metadata?.fileName : null,
          // Include all relevant metadata for link memories
          ai_summary: match.metadata?.ai_summary,
          username: match.metadata?.username,
          hashtags: match.metadata?.hashtags,
          caption: match.metadata?.caption,
          searchableText: match.metadata?.searchableText
        }))
        .slice(0, limit); // Take up to requested limit after filtering
    } else {
      // In-memory vector search with filtering
      const allResults = searchMemoriesInMemory(query, queryEmbedding, limit * 2);
      searchResults = allResults
        .filter(memory => {
          const threshold = memory.type === 'link' ? LINK_RELEVANCE_THRESHOLD : BASE_RELEVANCE_THRESHOLD;
          return memory.score >= threshold;
        })
        .slice(0, limit);
    }

    console.log(`📊 Final search results: ${searchResults.length} memories (after type-specific filtering)`);
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.type || 'unknown'} - "${result.title || 'Untitled'}" (Score: ${result.score?.toFixed(3)})`);
    });

    // Use RAG to generate enhanced results with context
    if (searchResults.length > 0) {
      const contextText = searchResults.map(result => 
        `${result.title}: ${result.content || ''}`
      ).join('\n');

      const ragPrompt = `Based on the search query "${query}" and these relevant memories:

${contextText}

Provide insights about the search results in JSON format:
{
  "search_insights": "Brief insight about what was found",
  "suggested_filters": ["category1", "category2"],
  "related_queries": ["similar query 1", "similar query 2"],
  "content_summary": "Summary of the found content"
}`;

      try {
        const ragResult = await model.generateContent(ragPrompt);
        const ragResponse = await ragResult.response;
        const responseText = cleanGeminiResponse(ragResponse.text());
        const insights = JSON.parse(responseText);
        
        return {
          results: searchResults,
          insights: insights,
          total: searchResults.length
        };
      } catch (ragError) {
        console.error('RAG enhancement failed:', ragError);
      }
    }

    return {
      results: searchResults,
      insights: null,
      total: searchResults.length
    };

  } catch (error) {
    console.error('Error in RAG search:', error);
    throw error;
  }
}

// Fallback cosine similarity function
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Analyze content function for the simplified API
async function analyzeContent(memoryData) {
  try {
    let searchableText = '';
    let analysis = {};

    switch (memoryData.type) {
      case 'text':
        searchableText = `${memoryData.title || ''} ${memoryData.content}`.trim();
        analysis = await analyzeTextContent(memoryData.content, memoryData.title);
        // Include timestamp in searchable text for temporal searches
        searchableText += ` ${analysis.timestamp_searchable || ''}`;
        break;
      case 'image':
        if (memoryData.imageData) {
          // For demo purposes, create basic analysis
          const now = new Date();
          analysis = {
            title: 'Image Memory',
            description: 'User uploaded image',
            objects: ['image'],
            tags: ['photo', 'memory'],
            category: 'personal',
            created_at: now.toISOString(),
            date_readable: now.toLocaleDateString(),
            time_readable: now.toLocaleTimeString(),
            day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
            month_year: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            timestamp_searchable: `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
          };
          searchableText = `${analysis.title} ${analysis.description} ${analysis.tags.join(' ')} ${analysis.timestamp_searchable}`;
        }
        break;
      case 'link':
        searchableText = `${memoryData.title || ''} ${memoryData.url}`.trim();
        analysis = await analyzeUrlContent(memoryData.url, memoryData.title);
        // Include timestamp in searchable text for temporal searches
        searchableText += ` ${analysis.timestamp_searchable || ''}`;
        break;
    }

    return {
      searchableText,
      ...analysis
    };
  } catch (error) {
    console.error('Error analyzing content:', error);
    const now = new Date();
    return {
      searchableText: `${memoryData.content || memoryData.url || 'Memory'} ${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })}`,
      title: 'Memory',
      category: 'general',
      created_at: now.toISOString(),
      timestamp_searchable: `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    };
  }
}

// Search memories in memory
function searchMemoriesInMemory(query, queryEmbedding, limit = 10) {
  if (memoryStore.length === 0) return [];

  return memoryStore
    .map(memory => ({
      ...memory,
      score: cosineSimilarity(queryEmbedding, memory.embedding || [])
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ embedding, ...memory }) => memory);
}

// Generate search insights
async function generateSearchInsights(query, results) {
  try {
    if (results.length === 0) {
      return {
        search_insights: 'No memories found for this search.',
        suggested_filters: [],
        related_queries: [],
        content_summary: 'No content to summarize.'
      };
    }

    const contextText = results.map(result => 
      `${result.title || ''}: ${result.content || result.url || ''}`
    ).join('\n').substring(0, 1000); // Limit context

    const ragPrompt = `Based on the search query "${query}" and these relevant memories:

${contextText}

Provide insights about the search results in JSON format:
{
  "search_insights": "Brief insight about what was found",
  "suggested_filters": ["category1", "category2"],
  "related_queries": ["similar query 1", "similar query 2"],
  "content_summary": "Summary of the found content"
}`;

    const ragResult = await model.generateContent(ragPrompt);
    const ragResponse = await ragResult.response;
    const responseText = cleanGeminiResponse(ragResponse.text());
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error generating search insights:', error);
    return {
      search_insights: `Found ${results.length} relevant memories for "${query}".`,
      suggested_filters: [],
      related_queries: [],
      content_summary: 'Content analysis unavailable.'
    };
  }
}

// Helper function to get image URL for a memory
function getImageUrl(memoryId, fileName) {
  if (fileName) {
    return `http://localhost:3000/uploads/${fileName}`;
  }
  
  // Fallback: try to find file by memory ID prefix
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    
    // Look for files that start with the memory ID
    const matchingFile = files.find(file => file.startsWith(memoryId));
    
    if (matchingFile) {
      return `http://localhost:3000/uploads/${matchingFile}`;
    }
  } catch (error) {
    console.error('Error finding image file:', error);
  }
  
  return null;
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Memory App Backend with Vector Database is running',
    vectorDB: index ? 'Pinecone connected' : 'In-memory fallback',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    storage: index ? 'pinecone' : 'in-memory'
  });
});

// Add memory - Image/Screenshot
app.post('/api/memory/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = req.file.path;
    const metadata = await extractImageMetadata(imagePath);
    
    // Generate comprehensive text for embedding
    const combinedText = `${metadata.title} ${metadata.description} ${metadata.objects.join(' ')} ${metadata.activities.join(' ')} ${metadata.tags.join(' ')} ${metadata.text_content} ${metadata.scene} ${metadata.mood} ${metadata.colors.join(' ')}`;
    const embedding = await generateEmbedding(combinedText);

    const memory = {
      id: uuidv4(),
      type: 'image',
      filePath: req.file.path,
      fileName: req.file.filename,
      title: metadata.title,
      metadata,
      embedding,
      combinedText,
      createdAt: new Date().toISOString()
    };

    // Store in vector database
    await storeMemoryVector(memory);

    // Clean the metadata response by filtering out null values
    const cleanMetadata = {};
    for (const [key, value] of Object.entries(memory.metadata)) {
      if (value !== null && value !== undefined) {
        cleanMetadata[key] = value;
      }
    }

    res.json({
      success: true,
      memory: {
        id: memory.id,
        type: memory.type,
        title: memory.title,
        metadata: cleanMetadata,
        createdAt: memory.createdAt
      }
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Add memory - Text note
app.post('/api/memory/text', async (req, res) => {
  try {
    const { content, title } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'No text content provided' });
    }

    const metadata = await analyzeTextContent(content, title);
    const combinedText = `${metadata.title} ${content} ${metadata.keywords.join(' ')} ${metadata.topics.join(' ')} ${metadata.entities.join(' ')} ${metadata.tags.join(' ')} ${metadata.category}`;
    const embedding = await generateEmbedding(combinedText);

    const memory = {
      id: uuidv4(),
      type: 'text',
      content,
      title: title || metadata.title,
      metadata,
      embedding,
      combinedText,
      createdAt: new Date().toISOString()
    };

    await storeMemoryVector(memory);

    // Clean the metadata response by filtering out null values
    const cleanMetadata = {};
    for (const [key, value] of Object.entries(memory.metadata)) {
      if (value !== null && value !== undefined) {
        cleanMetadata[key] = value;
      }
    }

    res.json({
      success: true,
      memory: {
        id: memory.id,
        type: memory.type,
        title: memory.title,
        content: memory.content,
        metadata: cleanMetadata,
        createdAt: memory.createdAt
      }
    });
  } catch (error) {
    console.error('Error processing text:', error);
    res.status(500).json({ error: 'Failed to process text note' });
  }
});

// Add memory - Link/URL
app.post('/api/memory/link', async (req, res) => {
  try {
    const { url, title, description } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    console.log('\n' + '='.repeat(80));
    console.log('📝 PROCESSING LINK MEMORY FOR ENHANCED STORAGE');
    console.log('='.repeat(80));
    console.log(`🔗 URL: ${url}`);
    console.log(`📝 Title: ${title || 'N/A'}`);
    console.log(`📝 Description: ${description || 'N/A'}`);

    // Extract metadata using existing function
    const metadata = await analyzeUrlContent(url, title, description);
    console.log('\n🔍 EXTRACTED METADATA:');
    console.log('-'.repeat(40));
    for (const [key, value] of Object.entries(metadata)) {
      if (key !== 'ai_summary') {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    // Generate AI summary for link memories only
    console.log('\n🤖 GENERATING AI SUMMARY FOR LINK MEMORY:');
    console.log('-'.repeat(40));
    const aiSummary = await generateLinkMemorySummary(metadata);
    metadata.ai_summary = aiSummary;

    // Create enhanced embedding text (like MemoryApp)
    const title_text = metadata.title || '';
    const description_text = metadata.description || '';
    const caption_text = metadata.caption || '';
    const ai_summary_text = metadata.ai_summary || '';
    const username_text = metadata.username ? `@${metadata.username}` : '';
    const platform_text = metadata.platform || '';
    const type_text = metadata.type || '';
    const hashtags_text = (metadata.hashtags && Array.isArray(metadata.hashtags)) 
      ? metadata.hashtags.map(tag => `#${tag}`).join(' ') 
      : '';

    // Combine all text for embedding - structured like MemoryApp
    const combinedText = `${title_text} ${description_text} ${caption_text} ${ai_summary_text} ${username_text} ${platform_text} ${type_text} ${hashtags_text}`.trim();

    console.log('\n🔤 EMBEDDING TEXT CONSTRUCTION:');
    console.log('-'.repeat(40));
    console.log(`  Title: "${title_text}"`);
    console.log(`  Description: "${description_text}"`);
    console.log(`  Caption: "${caption_text}"`);
    console.log(`  AI Summary: "${ai_summary_text}"`);
    console.log(`  Username: "${username_text}"`);
    console.log(`  Platform: "${platform_text}"`);
    console.log(`  Type: "${type_text}"`);
    console.log(`  Hashtags: "${hashtags_text}"`);
    console.log(`\n🎯 FINAL EMBEDDING TEXT:`);
    console.log(`  "${combinedText}"`);
    console.log(`  Length: ${combinedText.length} characters`);

    // Generate enhanced embedding
    console.log('\n🔄 GENERATING NORMALIZED EMBEDDING...');
    const embedding = await generateEmbedding(combinedText);

    const memory = {
      id: uuidv4(),
      type: 'link',
      url,
      title: title || metadata.title,
      description: description || metadata.description,
      metadata,
      embedding,
      combinedText,
      createdAt: new Date().toISOString()
    };

    console.log('\n💾 STORING IN VECTOR DATABASE...');
    await storeMemoryVector(memory);

    // Clean the metadata response by filtering out null values
    const cleanMetadata = {};
    for (const [key, value] of Object.entries(memory.metadata)) {
      if (value !== null && value !== undefined) {
        cleanMetadata[key] = value;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 LINK MEMORY PROCESSING COMPLETE');
    console.log('='.repeat(80));

    res.json({
      success: true,
      memory: {
        id: memory.id,
        type: memory.type,
        url: memory.url,
        title: memory.title,
        description: memory.description,
        metadata: cleanMetadata,
        createdAt: memory.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error processing link:', error);
    res.status(500).json({ error: 'Failed to process link' });
  }
});

// Search memories endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🔍 Searching for: "${query}"`);

    // Generate embeddings for the search query
    const searchEmbedding = await generateEmbedding(query);

    // Define relevance threshold - now unified at 0.6 for all memory types
    const BASE_RELEVANCE_THRESHOLD = 0.6; // For text and image memories
    const LINK_RELEVANCE_THRESHOLD = 0.6;  // For link memories (now same as base)
    let searchResults;
    
    // Use Pinecone if available, otherwise use in-memory search
    if (index) {
      // Pinecone vector search
      const searchResponse = await index.query({
        vector: searchEmbedding,
        topK: limit * 2, // Search more candidates to allow for filtering
        includeMetadata: true,
        includeValues: false
      });

      console.log(`🔍 Search found ${searchResponse.matches.length} potential matches`);
      
      // Apply different thresholds based on memory type
      searchResults = searchResponse.matches
        .filter(match => {
          const memoryType = match.metadata?.type;
          const threshold = memoryType === 'link' ? LINK_RELEVANCE_THRESHOLD : BASE_RELEVANCE_THRESHOLD;
          const isRelevant = match.score >= threshold;
          
          console.log(`📊 Search result ${match.id}: Type="${memoryType}", Score=${match.score.toFixed(3)}, Threshold=${threshold}, Relevant=${isRelevant}`);
          console.log(`    Title: "${match.metadata?.title || 'No title'}"`);
          console.log(`    Content: "${(match.metadata?.content || 'No content').substring(0, 100)}${(match.metadata?.content?.length || 0) > 100 ? '...' : ''}"`);
          if (memoryType === 'link') {
            console.log(`    URL: "${match.metadata?.url || 'No URL'}"`);
            console.log(`    Platform: "${match.metadata?.platform || 'No platform'}"`);
            console.log(`    AI Summary: "${(match.metadata?.ai_summary || 'No AI summary').substring(0, 80)}${(match.metadata?.ai_summary?.length || 0) > 80 ? '...' : ''}"`);
            if (!isRelevant) {
              console.log(`❌ Link memory filtered out from search: "${match.metadata?.title || 'Untitled'}" (${match.score.toFixed(3)} < ${threshold})`);
            }
          }
          
          return isRelevant;
        })
        .map(match => ({
          id: match.id,
          score: match.score,
          type: match.metadata?.type,
          title: match.metadata?.title,
          content: match.metadata?.content,
          url: match.metadata?.url,
          description: match.metadata?.description,
          createdAt: match.metadata?.createdAt,
          objects: match.metadata?.objects,
          scene: match.metadata?.scene,
          tags: match.metadata?.tags,
          category: match.metadata?.category,
          platform: match.metadata?.platform,
          imagePath: match.metadata?.type === 'image' ? match.metadata?.fileName : null,
          // Include all relevant metadata for link memories
          ai_summary: match.metadata?.ai_summary,
          username: match.metadata?.username,
          hashtags: match.metadata?.hashtags,
          caption: match.metadata?.caption,
          searchableText: match.metadata?.searchableText
        }))
        .slice(0, limit); // Take up to requested limit after filtering
    } else {
      // In-memory vector search with filtering
      const allResults = searchMemoriesInMemory(query, searchEmbedding, limit * 2);
      searchResults = allResults
        .filter(memory => {
          const threshold = memory.type === 'link' ? LINK_RELEVANCE_THRESHOLD : BASE_RELEVANCE_THRESHOLD;
          return memory.score >= threshold;
        })
        .slice(0, limit);
    }

    console.log(`📊 Final search results: ${searchResults.length} memories (after type-specific filtering)`);
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.type || 'unknown'} - "${result.title || 'Untitled'}" (Score: ${result.score?.toFixed(3)})`);
    });

    // Generate AI insights about the search results
    const aiInsights = await generateSearchInsights(query, searchResults);

    res.json({
      query,
      results: searchResults,
      aiInsights,
      searchMethod: index ? 'pinecone' : 'in-memory',
      relevanceThreshold: BASE_RELEVANCE_THRESHOLD,
      totalFiltered: searchResults.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

// Get all memories (for fallback)
app.get('/api/memories', async (req, res) => {
  try {
    if (index) {
      // Query all vectors from Pinecone (this is expensive, use sparingly)
      const allVectors = await index.query({
        vector: new Array(768).fill(0),
        topK: 1000,
        includeMetadata: true
      });
      
      const memories = allVectors.matches.map(match => ({
        id: match.id,
        type: match.metadata?.type,
        title: match.metadata?.title,
        content: match.metadata?.content,
        createdAt: match.metadata?.createdAt
      }));
      
      res.json({
        success: true,
        memories,
        total: memories.length,
        source: 'pinecone'
      });
    } else {
      // Fallback to in-memory
      const memories = memoryStore.map(({ embedding, combinedText, ...memory }) => memory);
      res.json({
        success: true,
        memories,
        total: memories.length,
        source: 'memory'
      });
    }
  } catch (error) {
    console.error('Error retrieving memories:', error);
    res.status(500).json({ error: 'Failed to retrieve memories' });
  }
});

// Get memory by ID
app.get('/api/memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (index) {
      const result = await index.fetch([id]);
      if (result.vectors[id]) {
        const vector = result.vectors[id];
        res.json({
          success: true,
          memory: {
            id: vector.id,
            ...vector.metadata
          }
        });
      } else {
        res.status(404).json({ error: 'Memory not found' });
      }
    } else {
      const memory = memoryStore.find(m => m.id === id);
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      const { embedding, combinedText, ...memoryData } = memory;
      res.json({ success: true, memory: memoryData });
    }
  } catch (error) {
    console.error('Error retrieving memory:', error);
    res.status(500).json({ error: 'Failed to retrieve memory' });
  }
});

// Delete memory
app.delete('/api/memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (index) {
      await index.deleteOne(id);
    } else {
      const index_mem = memoryStore.findIndex(m => m.id === id);
      if (index_mem === -1) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      const memory = memoryStore[index_mem];
      
      // Delete file if it's an image
      if (memory.type === 'image' && memory.filePath) {
        try {
          fs.unlinkSync(memory.filePath);
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
      
      memoryStore.splice(index_mem, 1);
    }
    
    res.json({ success: true, message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// Add memory endpoint
app.post('/api/memories', upload.single('image'), async (req, res) => {
  try {
    const { type, content, url } = req.body;
    const imageFile = req.file;

    if (!type || (!content && !imageFile && !url)) {
      return res.status(400).json({ error: 'Type and content/image/url are required' });
    }

    console.log(`📝 Adding new ${type} memory`);

    // Prepare memory data
    const memoryData = {
      id: Date.now().toString(),
      type,
      content: content || '',
      url: url || '',
      createdAt: new Date().toISOString(),
      imageData: null
    };

    // Handle image processing
    if (imageFile) {
      memoryData.imageData = imageFile.buffer.toString('base64');
      memoryData.imageMimeType = imageFile.mimetype;
    }

    // Generate AI analysis and embeddings
    const analysis = await analyzeContent(memoryData);
    const embeddings = await generateEmbedding(analysis.searchableText);

    // Store in vector database or in-memory
    if (index) {
      // Store in Pinecone
      await index.upsert([{
        id: memoryData.id,
        values: embeddings,
        metadata: {
          type: memoryData.type,
          content: memoryData.content,
          url: memoryData.url,
          createdAt: memoryData.createdAt,
          ...analysis
        }
      }]);
      console.log('✅ Memory stored in Pinecone');
    } else {
      // Store in memory
      memoryData.embeddings = embeddings;
      memoryData.analysis = analysis;
      memoryStore.push(memoryData);
      console.log('✅ Memory stored in-memory');
    }

    res.json({
      success: true,
      memory: {
        id: memoryData.id,
        type: memoryData.type,
        content: memoryData.content,
        url: memoryData.url,
        createdAt: memoryData.createdAt,
        analysis,
        storageMethod: index ? 'pinecone' : 'in-memory'
      }
    });

  } catch (error) {
    console.error('Error adding memory:', error);
    res.status(500).json({ error: 'Failed to add memory' });
  }
});

// Chatbot Endpoints

// Start a new conversation
app.post('/api/chat/start', (req, res) => {
  try {
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    conversations[sessionId] = {
      sessionId,
      messages: [],
      createdAt: now,
      lastActivity: now
    };
    
    console.log(`🗣️ Started new conversation: ${sessionId}`);
    
    res.json({
      success: true,
      sessionId,
      message: 'New conversation started! Ask me anything about your memories.'
    });
  } catch (error) {
    console.error('❌ Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Send a message in a conversation
app.post('/api/chat/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }
    
    if (!conversations[sessionId]) {
      return res.status(404).json({ error: 'Conversation not found. Please start a new conversation.' });
    }
    
    const conversation = conversations[sessionId];
    const now = new Date().toISOString();
    
    // Add user message to conversation
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: now
    };
    conversation.messages.push(userMessage);
    conversation.lastActivity = now;
    
    console.log(`💬 User message in ${sessionId}: "${message}"`);
    console.log("💬 Conversations",conversation);
  

    // Step 1: Use RAG to find relevant memories
    const searchEmbedding = await generateEmbedding(message);
    let relevantMemories = [];
    
    // Define relevance threshold - now unified at 0.6 for all memory types
    const BASE_RELEVANCE_THRESHOLD = 0.6; // For text and image memories
    const LINK_RELEVANCE_THRESHOLD = 0.6;  // For link memories (now same as base)
    
    if (index) {
      // Search in Pinecone
      const searchResponse = await index.query({
        vector: searchEmbedding,
        topK: 10, // Search more candidates to allow for filtering
        includeMetadata: true,
        includeValues: false
      });

      console.log(`🔍 Found ${searchResponse.matches.length} potential matches`);
      
      // Apply different thresholds based on memory type
      relevantMemories = searchResponse.matches
        .filter(match => {
          const memoryType = match.metadata?.type;
          const threshold = memoryType === 'link' ? LINK_RELEVANCE_THRESHOLD : BASE_RELEVANCE_THRESHOLD;
          const isRelevant = match.score >= threshold;
          
          console.log(`📊 Memory ${match.id}: Type="${memoryType}", Score=${match.score.toFixed(3)}, Threshold=${threshold}, Relevant=${isRelevant}`);
          if (memoryType === 'link' && !isRelevant) {
            console.log(`❌ Link memory filtered out from search: "${match.metadata?.title || 'Untitled'}" (${match.score.toFixed(3)} < ${threshold})`);
          }
          
          return isRelevant;
        })
        .map(match => ({
          id: match.id,
          score: match.score,
          type: match.metadata?.type,
          title: match.metadata?.title,
          content: match.metadata?.content,
          url: match.metadata?.url,
          description: match.metadata?.description,
          createdAt: match.metadata?.createdAt,
          objects: match.metadata?.objects,
          scene: match.metadata?.scene,
          tags: match.metadata?.tags,
          category: match.metadata?.category,
          platform: match.metadata?.platform,
          imagePath: match.metadata?.type === 'image' ? match.metadata?.fileName : null,
          // Include all relevant metadata for link memories
          ai_summary: match.metadata?.ai_summary,
          username: match.metadata?.username,
          hashtags: match.metadata?.hashtags,
          caption: match.metadata?.caption,
          searchableText: match.metadata?.searchableText
        }))
        .slice(0, 1); // Take only the most relevant memory

      // Filter to only include the most relevant image memory (if any)
      const imageMemories = relevantMemories.filter(memory => memory.type === 'image' && memory.imagePath);
      const topImageMemory = imageMemories.length > 0 ? [imageMemories[0]] : [];
      
      // Replace image memories in relevantMemories with only the top one
      relevantMemories = relevantMemories.filter(memory => memory.type !== 'image').concat(topImageMemory);
    } else {
      // Fallback to in-memory search with filtering
      const allResults = searchMemoriesInMemory(message, searchEmbedding, 10);
      relevantMemories = allResults
        .filter(memory => {
          const threshold = memory.type === 'link' ? LINK_RELEVANCE_THRESHOLD : BASE_RELEVANCE_THRESHOLD;
          return memory.score >= threshold;
        })
        .slice(0, 1); // Take only the most relevant memory
    }

    console.log(`📊 Final relevant memories: ${relevantMemories.length} (after type-specific filtering)`);
    relevantMemories.forEach((memory, index) => {
      console.log(`  ${index + 1}. ${memory.type} - "${memory.title}" (Score: ${memory.score?.toFixed(3)})`);
      if (memory.type === 'link') {
        console.log(`      URL: ${memory.url || 'No URL'}`);
        console.log(`      Platform: ${memory.platform || 'No platform'}`);
        console.log(`      Content: ${(memory.content || 'No content').substring(0, 80)}${(memory.content?.length || 0) > 80 ? '...' : ''}`);
      }
    });

    // Step 2: Build conversation context
    const recentMessages = conversation.messages.slice(-MAX_CONTEXT_MESSAGES);
    const conversationContext = recentMessages.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    // Step 3: Use LLM to analyze and answer with conversation context
    let answer = "I couldn't find any relevant information to answer your question.";
    let confidence = "low";
    let sources = [];

    if (relevantMemories.length > 0 || recentMessages.length > 1) {
      // Prepare context from relevant memories
      const memoryContext = relevantMemories.map((memory, index) => {
        let context = `Memory ${index + 1} (${memory.type}):\n`;
        if (memory.title) context += `Title: ${memory.title}\n`;
        if (memory.content) context += `Content: ${memory.content}\n`;
        if (memory.url) context += `URL: ${memory.url}\n`;
        if (memory.description) context += `Description: ${memory.description}\n`;
        if (memory.scene) context += `Scene: ${memory.scene}\n`;
        if (memory.objects) context += `Objects: ${memory.objects}\n`;
        if (memory.tags) context += `Tags: ${memory.tags}\n`;
        if (memory.createdAt) context += `Date: ${new Date(memory.createdAt).toLocaleDateString()}\n`;
        context += `Relevance Score: ${(memory.score * 100).toFixed(1)}%\n`;
        return context;
      }).join('\n---\n');

      console.log(`🤖 DEBUG - Memory context being sent to AI:`);
      console.log(`📝 Memory Context:\n${memoryContext}`);
      console.log(`💬 Conversation Context: ${conversationContext.substring(0, 200)}${conversationContext.length > 200 ? '...' : ''}`);
      console.log(`❓ User Message: "${message}"`);

      const prompt = `You are a friendly, helpful AI assistant chatting with someone about their personal memories. Think of yourself as a close friend who genuinely cares and remembers things they've shared.

CONVERSATION SO FAR:
${conversationContext}

THEIR CURRENT MESSAGE: "${message}"

WHAT I FOUND IN THEIR MEMORIES:
${memoryContext}

Instructions for responding:
- Be warm, friendly, and conversational (like texting a good friend)
- Use casual language and show genuine interest
- Reference specific details from their memory if you found something relevant
- If you found exactly what they're looking for, get excited about it!
- If you didn't find what they wanted, be apologetic and offer to help differently
- Keep it natural - no robotic language or formal tone
- Use "I" statements and make it personal
- Add some personality and warmth to your response

Respond in JSON format:
{
  "answer": "Your friendly, conversational response here",
  "confidence": "high/medium/low",
  "sources_used": ["brief description of memories you referenced"],
  "is_followup": ${recentMessages.length > 1 ? 'true' : 'false'}
}`;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = cleanGeminiResponse(response.text());
        const aiResponse = JSON.parse(responseText);
        
        answer = aiResponse.answer;
        confidence = aiResponse.confidence;
        sources = aiResponse.sources_used || [];
        
        console.log(`🤖 AI Answer: ${answer.substring(0, 100)}...`);
        console.log(`📊 Confidence: ${confidence}`);
        
      } catch (aiError) {
        console.error('❌ AI analysis failed:', aiError);
        // Fallback to simple answer
        if (relevantMemories.length > 0) {
          const topMemory = relevantMemories[0];
          answer = `I found information related to your question. Here's what I found: ${topMemory.title || topMemory.content || topMemory.description || 'A relevant memory'} from ${new Date(topMemory.createdAt).toLocaleDateString()}.`;
          confidence = "medium";
          sources = [`${topMemory.type} memory from ${new Date(topMemory.createdAt).toLocaleDateString()}`];
        } else if (recentMessages.length > 1) {
          answer = "I understand you're continuing our conversation, but I don't have specific memories related to your current question. Could you provide more details or ask about something else?";
          confidence = "low";
          sources = ["Conversation context"];
        }
      }
    }

    // Add AI response to conversation
    const aiMessage = {
      role: 'assistant',
      content: answer,
      confidence,
      sources,
      relevantMemories: relevantMemories.map(memory => ({
        ...memory,
        imagePath: memory.type === 'image' ? memory.imagePath : null
      })).slice(0, 1), // Return only the most relevant memory
      timestamp: new Date().toISOString()
    };
    conversation.messages.push(aiMessage);
    conversation.lastActivity = new Date().toISOString();

    res.json({
      success: true,
      sessionId,
      message: aiMessage,
      conversationLength: conversation.messages.length,
      searchMethod: index ? 'pinecone' : 'in-memory'
    });

  } catch (error) {
    console.error('❌ Chat message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get conversation history
app.get('/api/chat/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!conversations[sessionId]) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const conversation = conversations[sessionId];
    
    res.json({
      success: true,
      conversation: {
        sessionId: conversation.sessionId,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        lastActivity: conversation.lastActivity,
        messageCount: conversation.messages.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// List all conversations
app.get('/api/conversations', (req, res) => {
  try {
    const conversationList = Object.values(conversations).map(conv => ({
      sessionId: conv.sessionId,
      createdAt: conv.createdAt,
      lastActivity: conv.lastActivity,
      messageCount: conv.messages.length,
      preview: conv.messages.length > 0 ? conv.messages[0].content.substring(0, 100) : 'No messages'
    }));
    
    // Sort by last activity, most recent first
    conversationList.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    
    res.json({
      success: true,
      conversations: conversationList,
      total: conversationList.length
    });
  } catch (error) {
    console.error('❌ Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// Generate AI summary for link memories (based on MemoryApp approach)
async function generateLinkMemorySummary(metadata) {
  try {
    console.log('🤖 Generating AI summary for link memory...');
    
    const hashtags = metadata.hashtags || [];
    const hashtagsText = hashtags.length > 0 ? hashtags.map(tag => `#${tag}`).join(' ') : '';
    
    const summaryPrompt = `I have extracted the following metadata from a ${metadata.platform} ${metadata.type || 'post'}. Please create a concise, searchable summary based on this information:

Username: @${metadata.username || 'unknown'}
Post Type: ${metadata.type || 'unknown'}
Title: ${metadata.title || 'N/A'}
Caption: ${metadata.caption || metadata.description || 'No caption available'}
Hashtags: ${hashtagsText || 'No hashtags'}
Platform: ${metadata.platform || 'unknown'}

Based on this extracted information, create a brief summary (2-3 sentences) that:
1. Describes what this content appears to be about based on the caption and hashtags
2. Highlights key topics, themes, locations, or interesting details mentioned
3. Uses keywords that would help someone find this content later when searching
4. Mentions the platform and username for context

Focus on making it highly searchable - think about what terms someone would use when trying to remember this content.
Do not try to access any URLs. Only use the provided metadata above.`;

    console.log('🔄 Sending summary prompt to Gemini...');
    const summaryResponse = await model.generateContent(summaryPrompt);
    const aiSummary = summaryResponse.response.text().trim();
    
    console.log('✅ Generated AI summary:');
    console.log(`   ${aiSummary}`);
    
    return aiSummary;
  } catch (error) {
    console.error('❌ Error generating AI summary:', error);
    
    // Fallback summary based on available data
    const caption = metadata.caption || metadata.description || '';
    const username = metadata.username || 'unknown';
    const postType = metadata.type || 'post';
    const hashtags = metadata.hashtags || [];
    const platform = metadata.platform || 'social media';
    
    const fallbackParts = [`${platform} ${postType} by @${username}`];
    
    if (caption && caption.length > 10) {
      fallbackParts.push(`Caption: ${caption.substring(0, 150)}...`);
    }
    
    if (hashtags.length > 0) {
      fallbackParts.push(`Tags: ${hashtags.slice(0, 5).map(tag => `#${tag}`).join(', ')}`);
    }
    
    const fallbackSummary = fallbackParts.join('. ');
    console.log('⚠️ Using fallback AI summary:');
    console.log(`   ${fallbackSummary}`);
    
    return fallbackSummary;
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Memory App Backend with Vector Database running on port ${PORT}`);
  console.log(`📊 Vector DB: ${index ? 'Pinecone' : 'In-memory fallback'}`);
  console.log(`🔑 Make sure to set GOOGLE_API_KEY and PINECONE_API_KEY in your .env file`);
  console.log(`🌍 Server accessible at: http://0.0.0.0:${PORT} (all interfaces)`);
  console.log(`📱 Android emulator can connect via: http://10.0.2.2:${PORT}`);
}); 
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
    const indexHost = 'https://keepr-v1nybwf.svc.aped-4627-b74a.pinecone.io';
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
  origin: ['http://localhost:8081', 'http://127.0.0.1:8081'],
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
    
    const result = await embeddingModel.embedContent(text);
    
    console.log('✅ GOOGLE API: Successfully generated embedding via Google API');
    console.log(`📊 Embedding details:`);
    console.log(`   - Dimension: ${result.embedding.values.length}`);
    console.log(`   - Sample values: [${result.embedding.values.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`   - Data type: ${typeof result.embedding.values[0]}`);
    console.log(`   - Min value: ${Math.min(...result.embedding.values).toFixed(4)}`);
    console.log(`   - Max value: ${Math.max(...result.embedding.values).toFixed(4)}`);
    
    return result.embedding.values;
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

// Enhanced URL analysis
async function analyzeUrlContent(url, title = '', description = '') {
  try {
    console.log('🤖 GOOGLE API: Attempting URL analysis via Google Gemini...');
    const now = new Date();
    const prompt = `Analyze this URL and any provided context to extract metadata in JSON format:
    URL: "${url}"
    Title: "${title}"
    Description: "${description}"
    Current Date/Time: ${now.toISOString()}
    
    Provide:
    {
      "title": "improved title",
      "description": "enhanced description", 
      "domain": "domain name",
      "type": "video/article/social/news/documentation etc",
      "category": "technology/entertainment/news/education etc",
      "platform": "youtube/twitter/github etc",
      "tags": ["relevant", "tags"],
      "estimated_read_time": "5 minutes",
      "content_type": "tutorial/entertainment/news etc",
      "target_audience": "general/technical/academic etc",
      "relevance_score": 8.5,
      "created_at": "${now.toISOString()}",
      "date_readable": "${now.toLocaleDateString()}",
      "time_readable": "${now.toLocaleTimeString()}",
      "day_of_week": "${now.toLocaleDateString('en-US', { weekday: 'long' })}",
      "month_year": "${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}",
      "timestamp_searchable": "${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })} ${now.toLocaleDateString('en-US', { weekday: 'long' })} ${now.toLocaleDateString()} ${now.toLocaleTimeString()}"
    }`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log('✅ GOOGLE API: Successfully analyzed URL via Google Gemini');
    
    // Clean the response text more thoroughly
    let responseText = response.text();
    responseText = cleanGeminiResponse(responseText);
    
    const metadata = JSON.parse(responseText);
    return metadata;
  } catch (error) {
    console.error('❌ GOOGLE API: Error analyzing URL:', error.message);
    console.log('⚠️ FALLBACK: Using basic URL metadata instead');
    const now = new Date();
    return {
      title: title || new URL(url).hostname,
      description: description || 'Link content',
      domain: new URL(url).hostname,
      type: 'link',
      category: 'general',
      platform: new URL(url).hostname,
      tags: [],
      estimated_read_time: 'unknown',
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
    // Build metadata object, only including fields with actual values
    const metadata = {
      type: memory.type,
      title: memory.title || memory.metadata?.title || '',
      createdAt: memory.createdAt,
      content: memory.combinedText,
      category: memory.metadata?.category || memory.metadata?.type || 'general',
      importance: memory.metadata?.importance_level || memory.metadata?.relevance_score || 5
    };

    // Only add optional fields if they have valid values
    if (memory.fileName) {
      metadata.fileName = memory.fileName;
    }
    
    if (memory.url) {
      metadata.url = memory.url;
    }
    
    if (memory.description || memory.metadata?.description) {
      metadata.description = memory.description || memory.metadata.description;
    }

    // Add other useful metadata for searching
    if (memory.metadata?.objects) {
      metadata.objects = Array.isArray(memory.metadata.objects) ? 
        memory.metadata.objects.join(', ') : memory.metadata.objects;
    }
    
    if (memory.metadata?.scene) {
      metadata.scene = memory.metadata.scene;
    }
    
    if (memory.metadata?.tags) {
      metadata.tags = Array.isArray(memory.metadata.tags) ? 
        memory.metadata.tags.join(', ') : memory.metadata.tags;
    }

    // Add URL-specific metadata (only if they exist and are not null)
    if (memory.metadata?.platform) {
      metadata.platform = memory.metadata.platform;
    }

    if (memory.metadata?.content_type) {
      metadata.content_type = memory.metadata.content_type;
    }

    if (memory.metadata?.estimated_read_time && memory.metadata.estimated_read_time !== null) {
      metadata.estimated_read_time = memory.metadata.estimated_read_time;
    }

    if (memory.metadata?.relevance_score && memory.metadata.relevance_score !== null) {
      metadata.relevance_score = memory.metadata.relevance_score;
    }

    const vector = {
      id: memory.id,
      values: memory.embedding,
      metadata: metadata
    };

    await index.upsert([vector]);
    console.log(`✅ Stored memory ${memory.id} in Pinecone`);
  } catch (error) {
    console.error('❌ Error storing in Pinecone:', error);
    // Fallback to in-memory
    memoryStore.push(memory);
  }
}

// RAG-enhanced search
async function performRAGSearch(query, limit = 10) {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    let searchResults = [];

    if (index) {
      // Search in Pinecone
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true
      });

      searchResults = searchResponse.matches.map(match => ({
        id: match.id,
        similarity: match.score,
        type: match.metadata?.type,
        title: match.metadata?.title,
        content: match.metadata?.content,
        category: match.metadata?.category,
        importance: match.metadata?.importance,
        createdAt: match.metadata?.createdAt
      }));
    } else {
      // Fallback to in-memory search
      searchResults = memoryStore.map(memory => ({
        ...memory,
        similarity: cosineSimilarity(queryEmbedding, memory.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    }

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
  if (memories.length === 0) return [];

  return memories
    .map(memory => ({
      ...memory,
      score: cosineSimilarity(queryEmbedding, memory.embeddings || [])
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ embeddings, ...memory }) => memory);
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

    const metadata = await analyzeUrlContent(url, title, description);
    const combinedText = `${metadata.title} ${metadata.description} ${url} ${metadata.tags.join(' ')} ${metadata.category} ${metadata.platform} ${metadata.content_type}`;
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
        url: memory.url,
        title: memory.title,
        description: memory.description,
        metadata: cleanMetadata,
        createdAt: memory.createdAt
      }
    });
  } catch (error) {
    console.error('Error processing link:', error);
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

    let results;
    
    // Use Pinecone if available, otherwise use in-memory search
    if (index) {
      // Pinecone vector search
      const searchResponse = await index.query({
        vector: searchEmbedding,
        topK: limit,
        includeMetadata: true,
        includeValues: false
      });

      results = searchResponse.matches.map(match => ({
        id: match.id,
        score: match.score,
        ...match.metadata
      }));
    } else {
      // In-memory vector search
      results = searchMemoriesInMemory(query, searchEmbedding, limit);
    }

    // Generate AI insights about the search results
    const aiInsights = await generateSearchInsights(query, results);

    res.json({
      query,
      results,
      aiInsights,
      searchMethod: index ? 'pinecone' : 'in-memory'
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
      memories.push(memoryData);
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

    // Step 1: Use RAG to find relevant memories
    const searchEmbedding = await generateEmbedding(message);
    let relevantMemories = [];
    
    if (index) {
      // Search in Pinecone
      const searchResponse = await index.query({
        vector: searchEmbedding,
        topK: 5,
        includeMetadata: true,
        includeValues: false
      });

      relevantMemories = searchResponse.matches.map(match => ({
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
        imageUrl: match.metadata?.type === 'image' ? getImageUrl(match.id, match.metadata?.fileName) : null
      }));

      // Filter to only include the most relevant image memory (if any)
      const imageMemories = relevantMemories.filter(memory => memory.type === 'image' && memory.imageUrl);
      const topImageMemory = imageMemories.length > 0 ? [imageMemories[0]] : [];
      
      // Replace image memories in relevantMemories with only the top one
      relevantMemories = relevantMemories.filter(memory => memory.type !== 'image').concat(topImageMemory);
    } else {
      // Fallback to in-memory search
      relevantMemories = searchMemoriesInMemory(message, searchEmbedding, 5);
    }

    console.log(`📊 Found ${relevantMemories.length} relevant memories`);

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

      const prompt = `You are an AI assistant having a conversation with a user about their personal memories. 

CONVERSATION HISTORY:
${conversationContext}

CURRENT USER MESSAGE: "${message}"

RELEVANT MEMORIES FOUND:
${memoryContext}

Instructions:
1. Respond conversationally, acknowledging the conversation flow
2. Reference previous messages if relevant
3. Use the memories to provide helpful, specific answers
4. If this is a follow-up question, build on previous responses
5. Be natural and engaging, like a helpful assistant who remembers what you've talked about
6. Include specific details from memories (dates, times, locations, etc.)
7. If no relevant memories are found, acknowledge that and offer to help differently

Format your response as JSON:
{
  "answer": "Your conversational response here",
  "confidence": "high/medium/low",
  "sources_used": ["description of which memories or context were most helpful"],
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
      relevantMemories: relevantMemories.slice(0, 3), // Return top 3 for reference
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

app.listen(PORT, () => {
  console.log(`🚀 Memory App Backend with Vector Database running on port ${PORT}`);
  console.log(`📊 Vector DB: ${index ? 'Pinecone' : 'In-memory fallback'}`);
  console.log(`🔑 Make sure to set GOOGLE_API_KEY and PINECONE_API_KEY in your .env file`);
}); 
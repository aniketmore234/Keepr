# Keepr Project - High-Level Architecture Diagram

## Overview
Keepr is a multi-platform AI-powered memory management application with vector database integration for semantic search and RAG (Retrieval Augmented Generation) capabilities.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   React Native   │  │    Web App       │  │   Mobile App     │              │
│  │   App (Main)     │  │   (webapp/)      │  │   (recallr/)     │              │
│  │                  │  │                  │  │                  │              │
│  │ • HomeScreen     │  │ • HTML/CSS/JS    │  │ • AddMemoryScreen│              │
│  │ • AddMemory      │  │ • Memory Forms   │  │ • Chatbot Screen │              │
│  │ • SearchScreen   │  │ • Search UI      │  │ • Navigation     │              │
│  │ • MemoryDetail   │  │ • Chat Interface │  │ • Header/Footer  │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│           │                       │                       │                     │
│           └───────────────────────┼───────────────────────┘                     │
│                                   │                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST API
                                    │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               SERVICE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐                        │
│  │   Keepr SDK      │              │   API Service    │                        │
│  │   (sdk/)         │              │   (src/services) │                        │
│  │                  │              │                  │                        │
│  │ • KeeprSDK Class │              │ • ApiService.js  │                        │
│  │ • Memory Types   │              │ • HTTP Client    │                        │
│  │ • Voice Support  │              │ • Error Handling │                        │
│  │ • Validation     │              │ • Request/Response│                        │
│  └──────────────────┘              └──────────────────┘                        │
│           │                                   │                                 │
│           └───────────────────────────────────┘                                 │
│                                   │                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Express.js API Endpoints
                                    │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                      Node.js Express Server                              │  │
│  │                         (backend/server.js)                             │  │
│  │                                                                          │  │
│  │  API Endpoints:                    Core Services:                       │  │
│  │  • POST /api/memory/image         • Image Analysis                      │  │
│  │  • POST /api/memory/text          • Text Processing                     │  │
│  │  • POST /api/memory/link          • URL Content Extraction              │  │
│  │  • POST /api/search               • Vector Search & RAG                 │  │
│  │  • GET  /api/memories             • Memory Management                   │  │
│  │  • POST /api/chat                 • Chatbot Conversations               │  │
│  │                                                                          │  │
│  │  Middleware:                       Storage:                             │  │
│  │  • CORS                           • File Upload (Multer)                │  │
│  │  • JSON Parser                    • Conversations.json                  │  │
│  │  • File Static Serving            • In-Memory Fallback                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ API Calls
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AI & DATABASE LAYER                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐                        │
│  │   Google AI      │              │   Pinecone       │                        │
│  │   Services       │              │   Vector DB      │                        │
│  │                  │              │                  │                        │
│  │ • Gemini 1.5     │              │ • Vector Storage │                        │
│  │   Flash Model    │              │ • Similarity     │                        │
│  │ • embedding-001  │              │   Search         │                        │
│  │ • Image Analysis │              │ • 768-dim        │                        │
│  │ • Text Generation│              │   Embeddings     │                        │
│  │ • RAG Processing │              │ • Production     │                        │
│  │                  │              │   Scale          │                        │
│  └──────────────────┘              └──────────────────┘                        │
│           │                                   │                                 │
│           └─────────────┬─────────────────────┘                                 │
│                         │                                                       │
│  ┌──────────────────────┴──────────────────────┐                               │
│  │            Fallback Storage                 │                               │
│  │         (In-Memory Arrays)                  │                               │
│  │                                             │                               │
│  │ • memoryStore[]                             │                               │
│  │ • conversations{}                           │                               │
│  │ • Simple embeddings for offline mode       │                               │
│  └─────────────────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Memory Creation Flow
```
Client App → API Service → Express Server → Google AI Analysis → Vector Embedding → Pinecone Storage
     ↑                                                                                      ↓
     └──────────────── Response with Memory ID ←─────────────────────────────────────────┘
```

### 2. Search Flow
```
Search Query → Express Server → Google AI Embedding → Pinecone Vector Search → RAG Analysis → Enhanced Results
      ↑                                                                                              ↓
      └────────────────────── Results with AI Insights ←──────────────────────────────────────────┘
```

### 3. Chat Flow
```
User Message → Chatbot Endpoint → Conversation Context → Google AI → Response Generation → Context Update
      ↑                                                                                           ↓
      └─────────────────────── AI Response ←─────────────────────────────────────────────────────┘
```

## Key Components Breakdown

### Frontend Applications
- **Main React Native App**: Primary mobile interface with navigation, memory management, and search
- **Web App**: Browser-based interface for memory management and chat
- **Recallr App**: Alternative React Native implementation with enhanced UI/UX

### Service Layer
- **Keepr SDK**: Reusable TypeScript SDK with voice support and type definitions
- **API Service**: HTTP client abstraction for frontend-backend communication

### Backend Services
- **Express Server**: Central API hub handling all business logic
- **Memory Analysis**: AI-powered content understanding and metadata extraction
- **Vector Search**: Semantic search with RAG enhancement
- **Chat System**: Conversational AI with context management

### External Services
- **Google AI Platform**: Content analysis, embeddings, and text generation
- **Pinecone**: Production vector database for semantic search
- **File Storage**: Local file system for image uploads

## Architecture Benefits

1. **Modular Design**: Clear separation of concerns between layers
2. **Multi-Platform**: Support for web, mobile, and SDK integration
3. **AI-First**: Semantic search and RAG capabilities throughout
4. **Scalable**: Vector database for production workloads
5. **Resilient**: Fallback storage for offline/development scenarios
6. **Extensible**: SDK allows third-party integration 
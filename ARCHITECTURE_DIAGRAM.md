# Keepr Project - High-Level Architecture Diagram

## Overview
Keepr is a multi-platform AI-powered memory management application with vector database integration for semantic search and RAG (Retrieval Augmented Generation) capabilities.

## Component Architecture

```mermaid
graph TB
    %% Client Layer
    subgraph "CLIENT LAYER"
        WA["Web App (webapp/)
        • HTML/CSS/JS
        • Memory Forms
        • Search UI
        • Chat Interface"]
        RA["Mobile App (recallr/)
        • AddMemoryScreen
        • Chatbot Screen
        • Navigation
        • Header/Footer"]
    end
    
    %% Service Layer
    subgraph "SERVICE LAYER"
        SDK["Keepr SDK (sdk/)
        • KeeprSDK Class
        • Memory Types
        • Voice Support
        • Validation"]
        API["API Service (src/services/)
        • ApiService.js
        • HTTP Client
        • Error Handling
        • Request/Response"]
    end
    
    %% Backend Layer
    subgraph "BACKEND LAYER"
        subgraph "Express Server"
            EP["API Endpoints
            • POST /api/memory/image
            • POST /api/memory/text
            • POST /api/memory/link
            • POST /api/search
            • GET /api/memories
            • POST /api/chat"]
            CS["Core Services
            • Image Analysis
            • Text Processing
            • URL Content Extraction
            • Vector Search & RAG
            • Memory Management
            • Chatbot Conversations"]
            MW["Middleware
            • CORS
            • JSON Parser
            • File Static Serving"]
            ST["Storage
            • File Upload (Multer)
            • Conversations.json
            • In-Memory Fallback"]
        end
    end
    
    %% AI & Database Layer
    subgraph "AI & DATABASE LAYER"
        subgraph "Google AI Services"
            GM["Gemini 1.5 Flash Model
            • Image Analysis
            • Text Generation
            • RAG Processing"]
            EMB["embedding-001
            • 768-dim Embeddings
            • Semantic Understanding"]
        end
        
        subgraph "Pinecone Vector DB"
            PC["Vector Storage
            • Similarity Search
            • Production Scale
            • 768-dim Embeddings"]
        end
        
        subgraph "Fallback Storage"
            MEM["In-Memory Arrays
            • memoryStore[]
            • conversations{}
            • Simple embeddings"]
        end
    end
    
    %% Connections
    WA --> API
    RA --> API
    SDK --> API
    API --> EP
    EP --> CS
    CS --> GM
    CS --> EMB
    CS --> PC
    CS --> MEM
    EMB --> PC
    PC -.-> MEM
    MW --> ST
```

## Data Flow Diagrams

### 1. Memory Creation Flow
```mermaid
sequenceDiagram
    participant Client as Client App
    participant API as API Service
    participant Server as Express Server
    participant AI as Google AI
    participant Vector as Vector DB
    participant Storage as Pinecone/Memory
    
    Client->>API: Create Memory Request
    API->>Server: POST /api/memory/{type}
    Server->>AI: Analyze Content
    AI->>Server: Metadata & Insights
    Server->>AI: Generate Embedding
    AI->>Server: 768-dim Vector
    Server->>Storage: Store Vector + Metadata
    Storage->>Server: Confirm Storage
    Server->>API: Memory ID + Success
    API->>Client: Creation Response
```

### 2. Search Flow
```mermaid
sequenceDiagram
    participant Client as Client App
    participant Server as Express Server
    participant AI as Google AI
    participant Vector as Pinecone
    participant RAG as RAG Engine
    
    Client->>Server: Search Query
    Server->>AI: Generate Query Embedding
    AI->>Server: Query Vector
    Server->>Vector: Vector Similarity Search
    Vector->>Server: Matching Results
    Server->>RAG: Enhance with AI Insights
    RAG->>AI: Generate Insights
    AI->>RAG: Enhanced Analysis
    RAG->>Server: Enriched Results
    Server->>Client: Search Results + Insights
```

### 3. Chat Flow
```mermaid
sequenceDiagram
    participant Client as Client App
    participant Server as Express Server
    participant Context as Conversation Context
    participant AI as Google AI
    participant Storage as File Storage
    
    Client->>Server: Chat Message
    Server->>Context: Load Conversation History
    Context->>Server: Previous Messages
    Server->>AI: Message + Context
    AI->>Server: AI Response
    Server->>Context: Update Conversation
    Context->>Storage: Save to conversations.json
    Server->>Client: AI Response
```

## Component Interaction Map

```mermaid
graph LR
    subgraph "Frontend Clients"
        A[React Native Main]
        B[Web App]
        C[Recallr App]
    end
    
    subgraph "Service Layer"
        D[Keepr SDK]
        E[API Service]
    end
    
    subgraph "Backend Core"
        F[Express Server]
    end
    
    subgraph "AI Services"
        G[Google Gemini]
        H[Embeddings API]
    end
    
    subgraph "Data Storage"
        I[Pinecone Vector DB]
        J[File System]
        K[In-Memory Store]
    end
    
    A --> E
    B --> E
    C --> E
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K
    H --> I
    I -.-> K
```

## Technology Stack Overview

```mermaid
mindmap
  root((Keepr Project))
    Frontend
      React Native 0.73.0
      React Navigation 6
      React Native Paper
      React Native Image Picker
      TypeScript
    Backend
      Node.js
      Express.js
      Multer (File Upload)
      CORS Middleware
    AI/ML
      Google Gemini 1.5 Flash
      Google embedding-001
      Vector Embeddings (768-dim)
      RAG (Retrieval Augmented Generation)
    Database
      Pinecone Vector Database
      File System Storage
      In-Memory Fallback
    DevOps
      Google Cloud Platform
      Docker
      Cloud Build
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
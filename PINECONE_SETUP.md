# Pinecone Vector Database Setup Guide

This guide will help you set up Pinecone vector database for the Memory App's RAG (Retrieval Augmented Generation) functionality.

## Why Pinecone + RAG?

### Traditional Search vs Vector Search
- **Traditional**: Keyword matching, limited understanding
- **Vector Search**: Semantic understanding, meaning-based retrieval
- **RAG**: Enhanced results with AI-generated insights

### Benefits
- **Semantic Search**: Find "vacation photos" even if you search for "holiday memories"
- **Scalability**: Handle millions of memories efficiently
- **Smart Insights**: AI-generated search analysis and suggestions
- **Production Ready**: Real vector database instead of in-memory storage

## Step 1: Create Pinecone Account

1. Go to [pinecone.io](https://www.pinecone.io/)
2. Sign up for a free account
3. You get **100GB storage free** - perfect for testing!

## Step 2: Get API Key

1. After signing up, go to your [Pinecone Console](https://app.pinecone.io/)
2. Navigate to **API Keys** section
3. Copy your API key
4. Note your environment (usually `us-west1-gcp-free` for free tier)

## Step 3: Configure Environment

Edit `backend/.env`:

```bash
# Google Gemini API Key (required)
GOOGLE_API_KEY=AIzaSyDF13a-bPfjhpLXP0w2IMnXCfJ8PCDUNbc

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-west1-gcp-free
PINECONE_INDEX_NAME=memory-app-index

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Step 4: Install Dependencies

```bash
cd backend
npm install @pinecone-database/pinecone
```

## Step 5: Index Auto-Creation

The app will automatically:
1. Create a Pinecone index on first startup
2. Use 768-dimensional vectors (Google's embedding size)
3. Configure cosine similarity metric
4. Fall back to in-memory storage if Pinecone fails

## Step 6: Test the Setup

1. Start the backend:
   ```bash
   cd backend
   npm start
   ```

2. Look for these messages:
   ```
   ✅ Pinecone initialized successfully
   🚀 Memory App Backend with Vector Database running on port 3000
   📊 Vector DB: Pinecone
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

## How It Works

### 1. Memory Storage
```
User adds memory → Extract metadata with Gemini → Generate embeddings → Store in Pinecone
```

### 2. Search Process
```
User query → Generate query embedding → Search Pinecone → RAG enhancement → Return results + insights
```

### 3. Vector Embeddings
- **Images**: Title + description + objects + scene + colors + mood + tags
- **Text**: Content + keywords + topics + entities + category
- **Links**: URL + title + description + tags + platform + content type

### 4. RAG Enhancement
After finding similar memories, the system:
- Analyzes search context
- Provides insights about results
- Suggests related queries
- Offers content summaries

## Advanced Features

### Vector Similarity Matching
- Uses Google's 768-dimensional embeddings
- Cosine similarity for semantic matching
- Results ranked by relevance score

### Metadata Filtering
Pinecone stores minimal metadata:
- `type`: image/text/link
- `title`: Memory title
- `content`: Searchable content
- `category`: Auto-categorized content
- `importance`: Relevance score
- `createdAt`: Timestamp

### Fallback Mechanism
If Pinecone fails:
- App falls back to in-memory storage
- All features still work
- Easy to switch back when fixed

## Monitoring & Management

### Check Index Status
```javascript
// In Pinecone console or via API
const stats = await index.describeIndexStats();
console.log('Vector count:', stats.totalVectorCount);
```

### View Stored Vectors
Use Pinecone console to:
- Monitor vector count
- Check storage usage
- View query statistics

### Reset Index
If needed, delete and recreate:
```javascript
await pinecone.deleteIndex('memory-app-index');
// Restart app to recreate
```

## Troubleshooting

### Common Issues

1. **"Failed to initialize Pinecone"**
   - Check API key in `.env`
   - Verify environment name
   - Check internet connection
   - App falls back to in-memory storage

2. **"Index creation failed"**
   - Check Pinecone account limits
   - Verify you're on correct plan
   - Try different region

3. **"Embedding generation failed"**
   - Check Google API key
   - Verify Gemini API quota
   - Check network connectivity

### Debug Mode
Add to `backend/.env`:
```bash
NODE_ENV=development
DEBUG=pinecone:*
```

### Health Check
Monitor vector DB status:
```bash
curl http://localhost:3000/health
```

Response includes:
```json
{
  "status": "OK",
  "vectorDB": "Pinecone connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Cost & Scaling

### Free Tier Limits
- **100GB storage**: ~1M+ memories
- **2M queries/month**: Heavy usage covered
- **1 index**: Perfect for single app

### Scaling Options
- **Starter**: $70/month for production
- **Standard**: $140/month for high traffic
- **Enterprise**: Custom pricing

### Usage Optimization
- Efficient metadata storage
- Batch operations where possible
- Regular index maintenance

## Alternative Vector Databases

If you prefer other options:

### Weaviate (Open Source)
```bash
# Replace Pinecone with Weaviate
npm install weaviate-ts-client
```

### Chroma (Local)
```bash
# For local development
npm install chromadb
```

### Supabase Vector
```bash
# PostgreSQL with vector extension
npm install @supabase/supabase-js
```

## Production Deployment

### Environment Variables
```bash
PINECONE_API_KEY=prod_key_here
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=memory-app-prod
```

### Index Management
- Use separate indexes for dev/staging/prod
- Monitor performance metrics
- Set up automated backups

### Security
- Use environment-specific API keys
- Implement rate limiting
- Monitor usage patterns

## Next Steps

Once Pinecone is working:

1. **Test RAG Search**: Try complex queries
2. **Monitor Performance**: Check search speeds
3. **Analyze Insights**: Review AI-generated suggestions
4. **Scale Up**: Add more memory types
5. **Optimize**: Fine-tune embedding strategies

## Support

- **Pinecone Docs**: [docs.pinecone.io](https://docs.pinecone.io/)
- **Community**: [Pinecone Discord](https://discord.gg/pinecone)
- **Issues**: Check console logs and health endpoint 
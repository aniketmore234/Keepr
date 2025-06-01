# Keepr SDK

The official SDK for Keepr - Memory App with Vector Search and AI Analysis.

[![npm version](https://badge.fury.io/js/keepr-sdk.svg)](https://badge.fury.io/js/keepr-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🧠 **AI-Powered Memory Creation** - Text, image, and link memories with intelligent analysis
- 🔍 **Vector Search** - Semantic search across all your memories
- 🎤 **Voice Recording** - React Native voice integration
- 💪 **TypeScript Support** - Full type definitions included
- 🛡️ **Error Handling** - Comprehensive error types and validation
- 🔒 **Authentication** - Optional API key support
- 🌐 **Cross-Platform** - Works in Node.js and React Native

## Installation

```bash
npm install keepr-sdk
```

## Quick Start

### 1. Basic Setup

```javascript
const KeeprSDK = require('keepr-sdk');

const keepr = new KeeprSDK.default({
  endpoint: 'http://localhost:3000' // Your Keepr API endpoint
});

await keepr.initialize();
```

### 2. Create Your First Memory

```javascript
// Create a text memory
const memory = await keepr.createTextMemory(
  'Had coffee with Sarah. She mentioned her new job at Google.',
  'Coffee with Sarah',
  ['personal', 'meeting', 'sarah']
);

console.log('Memory created:', memory.id);
```

### 3. Search Your Memories

```javascript
const results = await keepr.searchMemories('coffee Sarah');
console.log(`Found ${results.totalResults} memories`);

results.results.forEach(memory => {
  console.log(`- ${memory.title}: ${memory.content}`);
});
```

## Core API

### Memory Types

**Text Memory**
```javascript
await keepr.createTextMemory(content, title?, tags?);
```

**Image Memory**
```javascript
await keepr.createImageMemory(
  { imageUrl: 'https://example.com/image.jpg' },
  caption?, title?, tags?
);
```

**Link Memory**
```javascript
await keepr.createLinkMemory(url, title?, description?, tags?);
```

### Search

```javascript
const results = await keepr.searchMemories(query, limit?);
// Returns: { results: [], totalResults: number, query: string }
```

### Basic Error Handling

```javascript
import { ValidationError, NetworkError } from 'keepr-sdk';

try {
  await keepr.createTextMemory('My memory');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Invalid input:', error.message);
  } else if (error instanceof NetworkError) {
    console.log('API error:', error.message);
  }
}
```

## Examples

You can run the included examples:

```bash
# Basic JavaScript example
node examples/basic-example.js

# TypeScript example (requires ts-node)
npx ts-node examples/typescript-example.ts
```

## API Reference

### Constructor

```typescript
new KeeprSDK(config?: KeeprConfig)
```

#### KeeprConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | - | Your API key for authentication |
| `endpoint` | string | `http://localhost:3000` | The API endpoint URL |

### Methods

#### initialize()

Initializes the SDK and validates configuration. Must be called before using other methods.

```typescript
await keepr.initialize();
```

**Throws:**
- `ValidationError` - Invalid configuration
- `NetworkError` - Connection issues
- `KeeprSDKError` - General initialization errors

---

#### createTextMemory(content, title?, tags?)

Creates a text-based memory.

```typescript
const memory = await keepr.createTextMemory(
  'Memory content',
  'Optional title',
  ['optional', 'tags']
);
```

**Parameters:**
- `content` (string, required): The text content (max 10,000 characters)
- `title` (string, optional): Title for the memory
- `tags` (string[], optional): Array of tags (max 20 tags)

**Returns:** `Promise<CreateMemoryResponse>`

**Throws:**
- `ValidationError` - Invalid input parameters
- `NetworkError` - API request failed
- `AuthenticationError` - Invalid API key

---

#### createImageMemory(imageData, caption?, title?, tags?)

Creates an image-based memory.

```typescript
// Using image URL
const memory = await keepr.createImageMemory(
  { imageUrl: 'https://example.com/image.jpg' },
  'Image caption',
  'Memory title',
  ['photo', 'memory']
);

// Using base64 encoded image
const memory = await keepr.createImageMemory(
  { imageBase64: 'data:image/jpeg;base64,/9j/4AAQ...' },
  'Image caption',
  'Memory title',
  ['photo', 'memory']
);
```

**Parameters:**
- `imageData` (object, required): Object containing either `imageUrl` or `imageBase64`
- `caption` (string, optional): Caption for the image
- `title` (string, optional): Title for the memory
- `tags` (string[], optional): Array of tags

**Returns:** `Promise<CreateMemoryResponse>`

---

#### createLinkMemory(url, title?, description?, tags?)

Creates a link-based memory.

```typescript
const memory = await keepr.createLinkMemory(
  'https://example.com',
  'Link title',
  'Link description',
  ['bookmark', 'article']
);
```

**Parameters:**
- `url` (string, required): Valid URL to save
- `title` (string, optional): Title for the link
- `description` (string, optional): Description of the link
- `tags` (string[], optional): Array of tags

**Returns:** `Promise<CreateMemoryResponse>`

---

#### searchMemories(query, limit?)

Searches memories using semantic vector search.

```typescript
const results = await keepr.searchMemories('quantum computing', 10);
```

**Parameters:**
- `query` (string, required): Search query (cannot be empty)
- `limit` (number, optional): Number of results (1-100, default: 10)

**Returns:** `Promise<SearchResponse>`

```typescript
interface SearchResponse {
  results: SearchMemoryResult[];
  totalResults: number;
  query: string;
}

interface SearchMemoryResult {
  id: string;
  content: string;
  title?: string;
  tags?: string[];
  score: number;
  createdAt: string;
}
```

---

#### getMemory(id)

Retrieves a specific memory by ID.

```typescript
const memory = await keepr.getMemory('memory-id-123');
```

**Parameters:**
- `id` (string, required): Memory ID

**Returns:** `Promise<Memory & { id: string; createdAt: string }>`

---

#### deleteMemory(id)

Deletes a memory by ID.

```typescript
const result = await keepr.deleteMemory('memory-id-123');
```

**Parameters:**
- `id` (string, required): Memory ID

**Returns:** `Promise<{ success: boolean; message: string }>`

---

#### Voice Recording (React Native only)

```typescript
// Start recording
await keepr.startRecording();

// Stop recording
await keepr.stopRecording();
```

**Note:** Voice recording requires `@react-native-voice/voice` peer dependency.

## Error Handling

The SDK provides specific error types for different scenarios:

```typescript
import { 
  ValidationError, 
  NetworkError, 
  AuthenticationError, 
  KeeprSDKError 
} from 'keepr-sdk';

try {
  await keepr.createTextMemory('');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Invalid input:', error.message);
  } else if (error instanceof NetworkError) {
    console.log('Network issue:', error.message, error.statusCode);
  } else if (error instanceof AuthenticationError) {
    console.log('Auth failed:', error.message);
  } else if (error instanceof KeeprSDKError) {
    console.log('SDK error:', error.message, error.code);
  }
}
```

### Error Types

| Error | Description | Common Causes |
|-------|-------------|---------------|
| `ValidationError` | Invalid input parameters | Empty content, invalid URLs, too many tags |
| `NetworkError` | Network or HTTP errors | API down, internet issues, rate limits |
| `AuthenticationError` | Authentication failures | Invalid API key, expired token |
| `KeeprSDKError` | General SDK errors | Not initialized, voice recording issues |

## Complete Examples

### Basic Usage

```typescript
import KeeprSDK from 'keepr-sdk';

async function example() {
  const keepr = new KeeprSDK({
    endpoint: 'https://api.keepr.com'
  });

  await keepr.initialize();

  // Create different types of memories
  const textMemory = await keepr.createTextMemory(
    'Had a great meeting with the team today. We discussed the new feature roadmap.',
    'Team Meeting',
    ['work', 'meeting', 'planning']
  );

  const linkMemory = await keepr.createLinkMemory(
    'https://react.dev',
    'React Documentation',
    'Official React documentation with guides and API reference',
    ['react', 'documentation', 'reference']
  );

  // Search for memories
  const searchResults = await keepr.searchMemories('team meeting');
  console.log(`Found ${searchResults.totalResults} related memories`);

  searchResults.results.forEach(memory => {
    console.log(`- ${memory.title}: ${memory.content.substring(0, 100)}...`);
  });
}
```

### Error Handling Example

```typescript
import KeeprSDK, { ValidationError, NetworkError } from 'keepr-sdk';

async function robustExample() {
  const keepr = new KeeprSDK();

  try {
    await keepr.initialize();
    
    const memory = await keepr.createTextMemory(
      'This is my memory content',
      'My Memory'
    );
    
    console.log('Memory created:', memory.id);
    
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation failed:', error.message);
      // Handle validation errors (fix input and retry)
    } else if (error instanceof NetworkError) {
      console.error('Network error:', error.message);
      if (error.statusCode === 429) {
        // Handle rate limiting
        console.log('Rate limited, waiting before retry...');
      }
    } else {
      console.error('Unexpected error:', error);
    }
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import KeeprSDK, { 
  TextMemory, 
  ImageMemory, 
  LinkMemory, 
  CreateMemoryResponse,
  SearchResponse,
  SearchMemoryResult
} from 'keepr-sdk';

// All types are available for use in your application
const memory: TextMemory = {
  type: 'text',
  content: 'My memory content',
  title: 'My Memory',
  tags: ['personal']
};
```

## Requirements

- Node.js 16.0.0 or higher
- For React Native voice features: `@react-native-voice/voice` ^3.2.4

## Need Help?

- Check the examples in the `/examples` directory
- Make sure your Keepr API server is running
- Verify your endpoint URL is correct

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

## Support

- 📖 [Documentation](https://github.com/keepr-team/keepr-sdk#readme)
- 🐛 [Issue Tracker](https://github.com/keepr-team/keepr-sdk/issues)
- 💬 [Discussions](https://github.com/keepr-team/keepr-sdk/discussions) 
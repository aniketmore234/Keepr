import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For iOS simulator, use localhost
// For Android emulator, use 10.0.2.2
const BASE_URL = Platform.select({
  ios: 'http://localhost:3000',
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout to 30 seconds
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data,
      baseURL: config.baseURL,
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
      },
    });
    return Promise.reject(error);
  }
);

export interface Memory {
  id?: string;
  title: string;
  content: string;
  type: 'text' | 'photo' | 'link';
  imageUrl?: string;
  createdAt?: string;
}

// Test network connectivity to the backend
export const testConnection = async () => {
  try {
    console.log('🔍 Testing connection to backend server...');
    console.log('🌐 Target URL:', BASE_URL);
    
    const response = await api.get('/api/memories', {
      timeout: 5000, // Short timeout for connection test
    });
    
    console.log('✅ Connection test successful:', response.status);
    return {
      success: true,
      status: response.status,
      baseUrl: BASE_URL,
      message: 'Backend server is accessible'
    };
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'Cannot connect to server. Please ensure the backend server is running.',
          baseUrl: BASE_URL,
          suggestion: 'Check if the server is running on ' + BASE_URL
        };
      } else if (error.code === 'TIMEOUT') {
        return {
          success: false,
          error: 'Connection timeout. Server is taking too long to respond.',
          baseUrl: BASE_URL,
          suggestion: 'Check your network connection and server status'
        };
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown connection error',
      baseUrl: BASE_URL,
      suggestion: 'Please check your network connection and ensure the backend server is running'
    };
  }
};

export const memoryApi = {
  // Create a new memory
  createMemory: async (memory: Memory) => {
    try {
      console.log('Creating memory with data:', memory);
      
      if (memory.type === 'photo' && memory.imageUrl) {
        // For photo type, use FormData
        const formData = new FormData();
        
        // Get the file name from the URI
        const uriParts = memory.imageUrl.split('/');
        const fileName = uriParts[uriParts.length - 1];
        
        // Get the file extension
        const fileExtParts = fileName.split('.');
        const fileExt = fileExtParts.length > 1 ? fileExtParts.pop()?.toLowerCase() : 'jpg';
        
        // Create a unique file name
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Add basic memory data
        formData.append('title', memory.title || 'Photo Memory');
        formData.append('content', memory.content || '');
        formData.append('type', 'image'); // Use 'image' instead of 'photo' to match server expectation
        
        // Add the image file
        formData.append('image', {
          uri: memory.imageUrl,
          name: uniqueFileName,
          type: `image/${fileExt}`,
        } as any);

        console.log('Sending photo upload request:', {
          uri: memory.imageUrl,
          fileName: uniqueFileName,
          type: `image/${fileExt}`,
        });

        // Use the correct endpoint for image upload
        const response = await api.post('/api/memory/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Accept: 'application/json',
          },
          transformRequest: (data, headers) => {
            // Return FormData directly
            return data;
          },
        });

        console.log('Photo upload response:', response.data);

        if (response.data.success) {
          const createdMemory = response.data.memory;
          return {
            id: createdMemory.id,
            title: createdMemory.title || 'Photo Memory',
            content: createdMemory.metadata?.description || '',
            type: 'photo',
            imageUrl: createdMemory.fileName ? `${BASE_URL}/uploads/${createdMemory.fileName}` : memory.imageUrl,
            createdAt: createdMemory.createdAt,
          };
        }
        
        throw new Error(response.data.message || 'Failed to upload photo');
      } else if (memory.type === 'link') {
        // For link type, use the Instagram-processing endpoint
        const data = {
          url: memory.content || '',
          title: memory.title || '',
          description: '', // Could add this field to the Memory interface if needed
        };

        console.log('Sending link memory to Instagram processing endpoint:', data);

        const response = await api.post('/api/memory/link', data, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Link memory response:', response.data);

        if (response.data.success) {
          const createdMemory = response.data.memory;
          return {
            id: createdMemory.id,
            title: createdMemory.title || '',
            content: createdMemory.url || '',
            type: 'link',
            imageUrl: undefined,
            createdAt: createdMemory.createdAt,
          };
        }
        
        throw new Error(response.data.message || 'Failed to create link memory');
      } else {
        // For text type, use JSON
        const data = {
          title: memory.title || '',
          content: memory.content || '',
          type: memory.type,
        };

        const response = await api.post('/api/memories', data, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.data.success) {
          const createdMemory = response.data.memory;
          return {
            id: createdMemory.id,
            title: createdMemory.title || '',
            content: createdMemory.content || '',
            type: createdMemory.type,
            imageUrl: undefined,
            createdAt: createdMemory.createdAt,
          };
        }
        
        throw new Error(response.data.message || 'Failed to create memory');
      }
    } catch (error) {
      console.error('Detailed error in createMemory:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        response: axios.isAxiosError(error) ? {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          request: error.request,
        } : null,
      });
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('API endpoint not found. Please check if the server is running and the endpoint path is correct.');
        } else if (error.response?.status === 413) {
          throw new Error('The image file is too large. Please try compressing it or choosing a smaller image.');
        } else if (error.response?.status === 500) {
          throw new Error('Server error while processing the image. Please try a different image or format (JPG/PNG recommended).');
        } else if (!error.response) {
          throw new Error('Network error. Please check if the server is running and accessible.');
        }
      }
      throw error;
    }
  },

  // Delete a memory
  deleteMemory: async (id: string) => {
    try {
      const response = await api.delete(`/api/memory/${id}`);
      return response.data.success;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.error('Memory or endpoint not found.');
        } else if (!error.response) {
          console.error('Network error. Please check if the server is running and accessible.');
        }
      }
      throw error;
    }
  },

  // Update a memory
  updateMemory: async (id: string, memory: Partial<Memory>) => {
    try {
      const response = await api.put(`/api/memory/${id}`, memory);
      return response.data.success;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.error('Memory or endpoint not found.');
        } else if (!error.response) {
          console.error('Network error. Please check if the server is running and accessible.');
        }
      }
      throw error;
    }
  },
};

// Define the return type interface
interface ChatResponse {
  text: string;
  error: null | string;
  confidence: string;
  sources: string[];
  relevantMemories: Array<{
    type: string;
    imagePath: string | null;
    [key: string]: any;
  }>;
}

export const chatbotApi = {
  // Session management
  _currentSessionId: null as string | null,

  // Start a new chat session
  getSession: async (): Promise<string> => {
    try {
      // If we already have a session ID, return it
      if (chatbotApi._currentSessionId) {
        return chatbotApi._currentSessionId;
      }

      const response = await api.post('/api/chat/start');
      if (response.data.success) {
        chatbotApi._currentSessionId = response.data.sessionId;
        return response.data.sessionId;
      }
      throw new Error('Failed to start chat session');
    } catch (error) {
      console.error('Error starting chat session:', error);
      // Generate a fallback session ID if server fails
      const fallbackId = Date.now().toString();
      chatbotApi._currentSessionId = fallbackId;
      return fallbackId;
    }
  },

  // Reset the current session
  resetSession: (): void => {
    chatbotApi._currentSessionId = null;
  },

  // Filter and deduplicate memories
  filterMemories: (memories: any[]) => {
    if (!memories || memories.length === 0) return [];

    const RELEVANCE_THRESHOLD = 0.6; // Only show memories with 60% or higher relevance
    const TITLE_MATCH_BOOST = 0.2; // Boost score by 20% if title is relevant
    const seen = new Set(); // Track unique content/URLs

    return memories
      .filter(memory => {
        // Filter by relevance score
        let adjustedScore = memory.score || 0;

        // Boost score if title matches the context
        if (memory.title) {
          // Title exists and is relevant to the context
          adjustedScore += TITLE_MATCH_BOOST;
        }

        memory.adjustedScore = Math.min(adjustedScore, 1); // Cap at 1.0

        if (memory.adjustedScore < RELEVANCE_THRESHOLD) {
          return false;
        }

        // Skip YouTube links and other video URLs
        if (memory.url && (
          memory.url.includes('youtube.com') ||
          memory.url.includes('youtu.be') ||
          memory.type === 'video'
        )) {
          return false;
        }

        // Create a unique key based on title first, then content or URL
        const key = memory.title || memory.url || memory.content;
        if (!key) return false;

        // Check for duplicates
        if (seen.has(key)) {
          return false;
        }

        // Only allow certain memory types
        const allowedTypes = ['text', 'image', 'note', 'link'];
        if (memory.type && !allowedTypes.includes(memory.type)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        // First sort by adjusted score (which includes title boost)
        const scoreDiff = b.adjustedScore - a.adjustedScore;
        if (Math.abs(scoreDiff) > 0.1) { // Only use score if difference is significant
          return scoreDiff;
        }
        
        // If scores are close, prioritize memories with titles
        if (a.title && !b.title) return -1;
        if (!a.title && b.title) return 1;
        
        // Then prioritize text and note memories over links
        if ((a.type === 'text' || a.type === 'note') && (b.type !== 'text' && b.type !== 'note')) return -1;
        if ((b.type === 'text' || b.type === 'note') && (a.type !== 'text' && a.type !== 'note')) return 1;
        
        // Finally sort by creation date if available
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        return 0;
      })
      .slice(0, 3) // Only show top 3 most relevant memories
      .map(memory => {
        // Clean up the memory object before returning
        const { adjustedScore, ...cleanMemory } = memory;
        return {
          ...cleanMemory,
          score: adjustedScore, // Replace original score with adjusted score
          relevanceNote: memory.title ? 'Title match boost applied' : undefined
        };
      });
  },

  // Send a message to the chatbot
  sendMessage: async (message: string): Promise<ChatResponse> => {
    try {
      const sessionId = await chatbotApi.getSession(); // This will now reuse existing session
      console.log('Using session ID:', sessionId);

      const response = await api.post('/api/chat/message', {
        sessionId,
        message,
      });

      if (response.data.success) {
        // Filter and deduplicate relevant memories
        const filteredMemories = chatbotApi.filterMemories(response.data.message.relevantMemories);

        return {
          text: response.data.message.content,
          error: null,
          confidence: response.data.message.confidence,
          sources: response.data.message.sources,
          relevantMemories: filteredMemories.map(memory => ({
            ...memory,
            type: memory.type || 'text',
            imagePath: memory.imagePath || null
          }))
        };
      }

      console.error('Unexpected API response:', response.data);
      throw new Error(response.data.message || 'Failed to get response from chatbot');
    } catch (error) {
      console.error('Error in sendMessage:', error);
      // If we get a 404 (session not found), try to create a new session
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        chatbotApi.resetSession(); // Clear the invalid session
        // Retry the message once with a new session
        return chatbotApi.sendMessage(message);
      }
      throw error;
    }
  },

  // Get conversation history - disabled since we're not using persistent sessions
  getHistory: async () => {
    return [];
  },
}; 
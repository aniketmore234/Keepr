import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface Memory {
  id: string;
  type: 'text' | 'image' | 'link';
  content?: string;
  url?: string;
  title?: string;
  description?: string;
  createdAt: string;
  analysis?: any;
  storageMethod?: string;
}

export interface SearchResult {
  query: string;
  results: Memory[];
  aiInsights?: any;
  searchMethod: string;
}

export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // Add a text memory
  async addTextMemory(content: string, title?: string): Promise<Memory> {
    const response = await api.post('/memories', {
      type: 'text',
      content,
      title,
    });
    return response.data.memory;
  },

  // Add an image memory
  async addImageMemory(imageUri: string): Promise<Memory> {
    const formData = new FormData();
    formData.append('type', 'image');
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'memory-image.jpg',
    } as any);

    const response = await api.post('/memories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.memory;
  },

  // Add a link memory
  async addLinkMemory(url: string, title?: string, description?: string): Promise<Memory> {
    const response = await api.post('/memories', {
      type: 'link',
      url,
      title,
      description,
    });
    return response.data.memory;
  },

  // Search memories
  async searchMemories(query: string, limit: number = 10): Promise<SearchResult> {
    const response = await api.post('/search', {
      query,
      limit,
    });
    return response.data;
  },

  // Get all memories
  async getAllMemories(): Promise<Memory[]> {
    const response = await api.get('/memories');
    return response.data.memories || [];
  },

  // Get memory by ID
  async getMemoryById(id: string): Promise<Memory> {
    const response = await api.get(`/memory/${id}`);
    return response.data.memory;
  },

  // Delete memory
  async deleteMemory(id: string): Promise<void> {
    await api.delete(`/memory/${id}`);
  },
};

export default apiService; 
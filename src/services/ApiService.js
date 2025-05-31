import axios from 'axios';

// Change this to your backend URL
// For development: use your computer's IP address (not localhost)
// For emulator: use 10.0.2.2 (Android) or localhost (iOS Simulator)
const BASE_URL = 'http://10.0.2.2:3000'; // Android emulator
// const BASE_URL = 'http://localhost:3000'; // iOS Simulator
// const BASE_URL = 'http://192.168.1.100:3000'; // Replace with your computer's IP

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ApiService = {
  // Health check
  async checkHealth() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add image memory
  async addImageMemory(imageUri, fileName) {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName || 'image.jpg',
      });

      const response = await api.post('/api/memory/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add text memory
  async addTextMemory(content, title) {
    try {
      const response = await api.post('/api/memory/text', {
        content,
        title,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add link memory
  async addLinkMemory(url, title, description) {
    try {
      const response = await api.post('/api/memory/link', {
        url,
        title,
        description,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Search memories
  async searchMemories(query, limit = 10) {
    try {
      const response = await api.post('/api/search', {
        query,
        limit,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get all memories
  async getAllMemories() {
    try {
      const response = await api.get('/api/memories');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get memory by ID
  async getMemoryById(id) {
    try {
      const response = await api.get(`/api/memory/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete memory
  async deleteMemory(id) {
    try {
      const response = await api.delete(`/api/memory/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Error handler
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.error || 'Server error occurred',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Network error
      return {
        message: 'Network error - please check your connection and backend server',
        status: 0,
        data: null,
      };
    } else {
      // Other error
      return {
        message: error.message || 'An unexpected error occurred',
        status: -1,
        data: null,
      };
    }
  },
}; 
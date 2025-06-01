import Voice from '@react-native-voice/voice';

export interface KeeprConfig {
  apiKey?: string;
  endpoint?: string;
}

export interface TextMemory {
  type: 'text';
  content: string;
  title?: string;
  tags?: string[];
}

export interface ImageMemory {
  type: 'image';
  imageUrl?: string;
  imageBase64?: string;
  caption?: string;
  title?: string;
  tags?: string[];
}

export interface LinkMemory {
  type: 'link';
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export type Memory = TextMemory | ImageMemory | LinkMemory;

export interface CreateMemoryResponse {
  id: string;
  success: boolean;
  message?: string;
}

export interface SearchMemoryResult {
  id: string;
  content: string;
  title?: string;
  tags?: string[];
  score: number;
  createdAt: string;
}

export interface SearchResponse {
  results: SearchMemoryResult[];
  totalResults: number;
  query: string;
}

// Custom error classes
export class KeeprSDKError extends Error {
  public code: string;
  public statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'KeeprSDKError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NetworkError extends KeeprSDKError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends KeeprSDKError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends KeeprSDKError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class KeeprSDK {
  private config: KeeprConfig;
  private isInitialized: boolean = false;

  constructor(config: KeeprConfig = {}) {
    this.config = {
      endpoint: 'http://localhost:3000',
      ...config
    };
  }

  /**
   * Initialize the SDK
   */
  async initialize(): Promise<void> {
    try {
      // Validate configuration
      if (this.config.endpoint && !this.isValidUrl(this.config.endpoint)) {
        throw new ValidationError('Invalid endpoint URL provided');
      }

      // Test connectivity (optional)
      if (this.config.endpoint !== 'http://localhost:3000') {
        await this.testConnection();
      }

      this.isInitialized = true;
    } catch (error) {
      if (error instanceof KeeprSDKError) {
        throw error;
      }
      throw new KeeprSDKError(`Failed to initialize SDK: ${error}`, 'INITIALIZATION_ERROR');
    }
  }

  /**
   * Test connection to the API
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.config.endpoint}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new NetworkError(`API health check failed: ${response.statusText}`, response.status);
      }
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(`Unable to connect to API at ${this.config.endpoint}`);
    }
  }

  /**
   * Get common headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate memory content
   */
  private validateMemory(memory: Memory): void {
    switch (memory.type) {
      case 'text':
        if (!memory.content || memory.content.trim().length === 0) {
          throw new ValidationError('Text memory content cannot be empty');
        }
        if (memory.content.length > 10000) {
          throw new ValidationError('Text memory content cannot exceed 10,000 characters');
        }
        break;
      
      case 'image':
        if (!memory.imageUrl && !memory.imageBase64) {
          throw new ValidationError('Image memory must have either imageUrl or imageBase64');
        }
        if (memory.imageUrl && !this.isValidUrl(memory.imageUrl)) {
          throw new ValidationError('Invalid image URL provided');
        }
        break;
      
      case 'link':
        if (!memory.url || !this.isValidUrl(memory.url)) {
          throw new ValidationError('Link memory must have a valid URL');
        }
        break;
    }

    // Validate tags
    if (memory.tags && memory.tags.length > 20) {
      throw new ValidationError('Cannot have more than 20 tags per memory');
    }
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      let errorMessage = `API request failed: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Unable to parse error response, use default message
      }

      switch (response.status) {
        case 401:
          throw new AuthenticationError('Invalid API key or authentication failed');
        case 403:
          throw new AuthenticationError('Access forbidden');
        case 404:
          throw new NetworkError('API endpoint not found', 404);
        case 429:
          throw new NetworkError('Rate limit exceeded. Please try again later', 429);
        case 500:
          throw new NetworkError('Internal server error', 500);
        default:
          throw new NetworkError(errorMessage, response.status);
      }
    }

    try {
      return await response.json();
    } catch (error) {
      throw new NetworkError('Invalid response format from API');
    }
  }

  /**
   * Start voice recording
   */
  async startRecording(): Promise<void> {
    try {
      await Voice.start('en-US');
    } catch (error) {
      throw new KeeprSDKError(`Failed to start recording: ${error}`, 'VOICE_ERROR');
    }
  }

  /**
   * Stop voice recording
   */
  async stopRecording(): Promise<void> {
    try {
      await Voice.stop();
    } catch (error) {
      throw new KeeprSDKError(`Failed to stop recording: ${error}`, 'VOICE_ERROR');
    }
  }

  /**
   * Create a text memory
   */
  async createTextMemory(content: string, title?: string, tags?: string[]): Promise<CreateMemoryResponse> {
    if (!content || typeof content !== 'string') {
      throw new ValidationError('Content is required and must be a string');
    }

    const memory: TextMemory = {
      type: 'text',
      content: content.trim(),
      title: title?.trim(),
      tags
    };

    return this.createMemory(memory);
  }

  /**
   * Create an image memory
   */
  async createImageMemory(
    imageData: { imageUrl?: string; imageBase64?: string },
    caption?: string,
    title?: string,
    tags?: string[]
  ): Promise<CreateMemoryResponse> {
    if (!imageData || (!imageData.imageUrl && !imageData.imageBase64)) {
      throw new ValidationError('Image data is required (either imageUrl or imageBase64)');
    }

    const memory: ImageMemory = {
      type: 'image',
      ...imageData,
      caption: caption?.trim(),
      title: title?.trim(),
      tags
    };

    return this.createMemory(memory);
  }

  /**
   * Create a link memory
   */
  async createLinkMemory(url: string, title?: string, description?: string, tags?: string[]): Promise<CreateMemoryResponse> {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required and must be a string');
    }

    const memory: LinkMemory = {
      type: 'link',
      url: url.trim(),
      title: title?.trim(),
      description: description?.trim(),
      tags
    };

    return this.createMemory(memory);
  }

  /**
   * Create a memory (generic method)
   */
  async createMemory(memory: Memory): Promise<CreateMemoryResponse> {
    if (!this.isInitialized) {
      throw new KeeprSDKError('SDK not initialized. Call initialize() first.', 'NOT_INITIALIZED');
    }

    this.validateMemory(memory);

    try {
      const response = await fetch(`${this.config.endpoint}/api/memories`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(memory)
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof KeeprSDKError) {
        throw error;
      }
      throw new NetworkError(`Failed to create memory: ${error}`);
    }
  }

  /**
   * Search memories using vector search
   */
  async searchMemories(query: string, limit?: number): Promise<SearchResponse> {
    if (!this.isInitialized) {
      throw new KeeprSDKError('SDK not initialized. Call initialize() first.', 'NOT_INITIALIZED');
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new ValidationError('Search query is required and cannot be empty');
    }

    if (limit && (limit < 1 || limit > 100)) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    try {
      const response = await fetch(`${this.config.endpoint}/api/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ 
          query: query.trim(),
          limit: limit || 10
        })
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof KeeprSDKError) {
        throw error;
      }
      throw new NetworkError(`Search failed: ${error}`);
    }
  }

  /**
   * Get memory by ID
   */
  async getMemory(id: string): Promise<Memory & { id: string; createdAt: string }> {
    if (!this.isInitialized) {
      throw new KeeprSDKError('SDK not initialized. Call initialize() first.', 'NOT_INITIALIZED');
    }

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Memory ID is required and must be a string');
    }

    try {
      const response = await fetch(`${this.config.endpoint}/api/memories/${id}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof KeeprSDKError) {
        throw error;
      }
      throw new NetworkError(`Failed to get memory: ${error}`);
    }
  }

  /**
   * Delete memory by ID
   */
  async deleteMemory(id: string): Promise<{ success: boolean; message: string }> {
    if (!this.isInitialized) {
      throw new KeeprSDKError('SDK not initialized. Call initialize() first.', 'NOT_INITIALIZED');
    }

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Memory ID is required and must be a string');
    }

    try {
      const response = await fetch(`${this.config.endpoint}/api/memories/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof KeeprSDKError) {
        throw error;
      }
      throw new NetworkError(`Failed to delete memory: ${error}`);
    }
  }
}

export default KeeprSDK; 
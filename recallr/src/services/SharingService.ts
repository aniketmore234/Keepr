import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import { DeviceEventEmitter, NativeEventEmitter, Platform, Alert } from 'react-native';
import { memoryApi } from './api';
import axios from 'axios';
import { config } from '../config/environment';

// TEMPORARY FIX: Use the same hardcoded URL as api.ts
const BASE_URL = 'https://recallr-backend-884973183549.us-central1.run.app';

export interface SharedContent {
  text?: string;
  weblink?: string;
  mimeType?: string;
  extraInfo?: any;
}

export interface NativeShareData {
  text?: string;
  subject?: string;
  url?: string;
  type: string;
  source: string;
}

// Callback types for loading management
type LoadingCallback = (message: string) => void;
type HideLoadingCallback = () => void;

class SharingService {
  private initialized = false;
  private showLoadingCallback?: LoadingCallback;
  private hideLoadingCallback?: HideLoadingCallback;
  private isProcessing = false;

  /**
   * Set callbacks for loading management
   */
  setLoadingCallbacks(showLoading: LoadingCallback, hideLoading: HideLoadingCallback) {
    this.showLoadingCallback = showLoading;
    this.hideLoadingCallback = hideLoading;
  }

  /**
   * Initialize the sharing service to listen for incoming shared content
   */
  initialize() {
    console.log(`🔍 initialize() called - current state: initialized=${this.initialized}`);
    
    if (this.initialized) {
      console.log('⚠️ Sharing service already initialized, skipping...');
      return;
    }

    console.log('🚀 Initializing sharing service...');

    // Simple initialization - just set up the basic listener
    this.setupBasicListener();

    this.initialized = true;
    console.log('✅ Sharing service initialized successfully');
  }

  /**
   * Setup basic sharing listener
   */
  private setupBasicListener() {
    try {
      console.log('📚 Setting up basic sharing listener...');
      
      // Check for shared content when app opens
      ReceiveSharingIntent.getReceivedFiles(
        (files: any[]) => {
          if (files && files.length > 0) {
            console.log('📚 Initial shared content found:', files);
            this.handleSharedFiles(files);
          } else {
            console.log('📚 No initial shared content');
          }
        },
        (error: any) => {
          console.log('📚 No shared content available:', error?.message || 'Normal');
        }
      );

      console.log('✅ Basic sharing listener setup completed');
    } catch (error) {
      console.error('❌ Error setting up basic sharing listener:', error);
    }
  }

  /**
   * Start listening for shared content while app is running
   */
  startListening() {
    console.log('🔄 Starting sharing listener...');
    
    try {
      ReceiveSharingIntent.getReceivedFiles(
        (files: any[]) => {
          if (files && files.length > 0) {
            console.log('🔄 New shared content detected:', files);
            this.handleSharedFiles(files);
          }
        },
        (error: any) => {
          console.log('📚 No new shared content');
        },
        'ShareMedia' // iOS share extension
      );
    } catch (error) {
      console.error('❌ Error starting sharing listener:', error);
    }
  }

  /**
   * Stop listening for shared content
   */
  stopListening() {
    console.log('🛑 Stopping sharing listener...');
    
    try {
      // Simple cleanup
      ReceiveSharingIntent.clearReceivedFiles();
      console.log('🧹 Cleared shared files');
    } catch (error) {
      console.error('❌ Error stopping sharing listener:', error);
    }
  }

  /**
   * Handle received shared files/content from library
   */
  private async handleSharedFiles(files: any[]) {
    if (!files || files.length === 0) {
      console.log('📚 No shared files to process');
      return;
    }

    if (this.isProcessing) {
      console.log('⏳ Already processing content, ignoring new shared files...');
      return;
    }

    console.log('🔄 Processing shared content:', files);
    this.isProcessing = true;

    // Show loading indication
    this.showLoadingNotification('Processing shared content...');

    try {
      for (const file of files) {
        try {
          await this.processSharedContent(file);
        } catch (error) {
          console.error('❌ Error processing shared content:', error);
          this.showErrorNotification('Failed to process shared content');
        }
      }
    } finally {
      // Simple cleanup after processing
      try {
        ReceiveSharingIntent.clearReceivedFiles();
        console.log('🧹 Cleared shared content after processing');
      } catch (error) {
        console.error('❌ Error clearing shared content:', error);
      }
      
      this.hideLoadingNotification();
      this.isProcessing = false;
    }
  }

  /**
   * Process individual shared content from library
   */
  private async processSharedContent(sharedContent: any) {
    if (!sharedContent) {
      console.log('⚠️ No shared content to process');
      return;
    }

    console.log('🔄 Processing individual shared content:', sharedContent);

    // Extract URL from different possible fields
    let url = '';
    let title = '';
    let description = '';

    // Check for web link (most common for Instagram shares)
    if (sharedContent.weblink) {
      url = sharedContent.weblink;
      console.log('🔗 Found weblink:', url);
    }
    // Check for text content that might contain a URL
    else if (sharedContent.text && this.isURL(sharedContent.text)) {
      url = sharedContent.text;
      console.log('🔗 Found URL in text:', url);
    }
    // Check for subject as title
    if (sharedContent.subject) {
      title = sharedContent.subject;
    }

    if (!url) {
      console.log('⚠️ No URL found in shared content:', sharedContent);
      return;
    }

    console.log('🎯 Processing URL:', url);

    await this.createMemoryFromUrl(url, title, description);
  }

  /**
   * Create memory from URL using the specific link endpoint for metadata extraction
   */
  private async createMemoryFromUrl(url: string, title: string, description: string) {
    try {
      // Validate that it's an Instagram URL
      const isInstagram = this.isInstagramURL(url);
      
      // Add detailed logging for debugging
      console.log('🔍 DETAILED URL ANALYSIS:');
      console.log('  Original URL:', JSON.stringify(url));
      console.log('  URL length:', url.length);
      console.log('  URL type:', typeof url);
      console.log('  Is Instagram:', isInstagram);
      console.log('  Title:', JSON.stringify(title));
      console.log('  Description:', JSON.stringify(description));
      
      if (isInstagram) {
        console.log('📸 Instagram URL detected, processing with metadata extraction...');
      } else {
        console.log('🔗 Processing non-Instagram URL with metadata extraction:', url);
      }

      // Use the specific /api/memory/link endpoint for proper Instagram processing
      console.log('💾 Creating link memory with metadata extraction...');
      console.log('🌐 Making request to:', `${BASE_URL}/api/memory/link`);
      
      const requestData = {
        url: url,
        title: title || '',
        description: description || ''
      };
      console.log('📤 Request payload:', JSON.stringify(requestData, null, 2));
      
      const response = await axios.post(`${BASE_URL}/api/memory/link`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response data:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.success) {
        console.log('✅ Successfully created link memory with metadata:', response.data);
        this.showSuccessNotification(`Memory saved from ${isInstagram ? 'Instagram' : 'shared'} content!`);
      } else {
        console.error('❌ Failed to create link memory - API response:', response.data);
        throw new Error(response.data?.message || 'Failed to create memory from shared content');
      }

    } catch (error) {
      console.error('❌ Error creating link memory:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.response?.status,
        data: (error as any)?.response?.data,
      });
      
      // Fallback to regular memory creation if link endpoint fails
      console.log('🔄 Attempting fallback to regular memory creation...');
      try {
        const isInstagram = this.isInstagramURL(url);
        const memory = {
          title: title || (isInstagram ? 'Instagram Content' : 'Shared Link'),
          content: url,
          type: 'link' as const,
        };

        console.log('🔄 Fallback memory data:', JSON.stringify(memory, null, 2));
        const fallbackResponse = await memoryApi.createMemory(memory);
        if (fallbackResponse) {
          console.log('✅ Successfully created fallback memory:', fallbackResponse);
          this.showSuccessNotification(`Memory saved from ${isInstagram ? 'Instagram' : 'shared'} content! (Basic format)`);
        } else {
          throw new Error('Fallback memory creation failed');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback memory creation also failed:', fallbackError);
        this.showErrorNotification('Failed to save shared content');
      }
    }
  }

  /**
   * Check if a string is a valid URL
   */
  private isURL(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    
    try {
      new URL(str.startsWith('http') ? str : `https://${str}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is from Instagram
   */
  private isInstagramURL(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    return url.toLowerCase().includes('instagram.com');
  }

  /**
   * Show loading notification
   */
  private showLoadingNotification(message: string) {
    console.log('⏳ LOADING:', message);
    if (this.showLoadingCallback) {
      this.showLoadingCallback(message);
    } else {
      // Fallback to Alert if no callback is set
      Alert.alert('Processing', message, [], { cancelable: false });
    }
  }

  /**
   * Hide loading notification
   */
  private hideLoadingNotification() {
    console.log('✅ HIDING LOADING');
    if (this.hideLoadingCallback) {
      this.hideLoadingCallback();
    }
  }

  /**
   * Show success notification
   */
  private showSuccessNotification(message: string) {
    console.log('✅ SUCCESS:', message);
    Alert.alert('Success', message, [{ text: 'OK' }]);
  }

  /**
   * Show error notification
   */
  private showErrorNotification(message: string) {
    console.error('❌ ERROR:', message);
    Alert.alert('Error', message, [{ text: 'OK' }]);
  }

  /**
   * Get any pending shared content when app starts
   * Made safer with better error handling
   */
  async getPendingSharedContent(): Promise<SharedContent[]> {
    return new Promise((resolve) => {
      try {
        ReceiveSharingIntent.getReceivedFiles(
          (files: any[]) => {
            if (!files || !Array.isArray(files)) {
              console.log('📚 No pending shared content found');
              resolve([]);
              return;
            }

            const sharedContent: SharedContent[] = files.map(file => ({
              text: file?.text || '',
              weblink: file?.weblink || '',
              mimeType: file?.mimeType || '',
              extraInfo: file
            }));
            
            console.log('📚 Found pending shared content:', sharedContent);
            resolve(sharedContent);
          },
          (error: any) => {
            // This is normal when there's no shared content
            console.log('📚 No pending shared content (normal):', error?.message || error);
            resolve([]);
          }
        );
      } catch (error) {
        console.error('❌ Error getting pending shared content:', error);
        resolve([]);
      }
    });
  }
}

export const sharingService = new SharingService(); 
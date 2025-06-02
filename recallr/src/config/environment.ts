// Import Platform from react-native
import { Platform } from 'react-native';

export interface Environment {
  API_BASE_URL: string;
  UPLOADS_BASE_PATH: string;
  ENVIRONMENT: 'development' | 'production';
}

// Development configuration (local backend)
const developmentConfig: Environment = {
  API_BASE_URL: Platform.select({
    ios: 'http://localhost:3000',
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
  }),
  UPLOADS_BASE_PATH: Platform.select({
    ios: 'http://localhost:3000/uploads',
    android: 'http://10.0.2.2:3000/uploads',
    default: 'http://localhost:3000/uploads',
  }),
  ENVIRONMENT: 'development',
};

// Production configuration (deployed backend)
const productionConfig: Environment = {
  // ✅ Updated with your actual deployed backend URL
  API_BASE_URL: 'https://recallr-backend-884973183549.us-central1.run.app',
  UPLOADS_BASE_PATH: 'https://recallr-backend-884973183549.us-central1.run.app/uploads',
  ENVIRONMENT: 'production',
};

// Determine which config to use
// ✅ Changed to true for APK generation
const USE_PRODUCTION = true;

export const config: Environment = USE_PRODUCTION ? productionConfig : developmentConfig; 
import axios from 'axios';

async function testAndroidConnection() {
  try {
    console.log('🧪 Testing Android emulator connection to server...');
    
    // Test health endpoint first
    const healthResponse = await axios.get('http://10.0.2.2:3000/api/health', {
      timeout: 10000
    });
    
    console.log('✅ Health check successful:', healthResponse.data);
    
    // Test Instagram processing
    const instagramResponse = await axios.post('http://10.0.2.2:3000/api/memory/link', {
      url: 'https://www.instagram.com/reel/DKRIjpmspIN/',
      title: '',
      description: ''
    }, {
      timeout: 30000
    });
    
    console.log('✅ Instagram processing successful!');
    console.log('📊 Title:', instagramResponse.data.memory?.title);
    console.log('📊 URL:', instagramResponse.data.memory?.url);
    
    if (instagramResponse.data.memory?.title?.includes('pizza')) {
      console.log('🍕 VERIFIED: Real Instagram data extracted');
    }
    
  } catch (error) {
    console.error('❌ Android connection test failed:', error.message);
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
    }
  }
}

testAndroidConnection(); 
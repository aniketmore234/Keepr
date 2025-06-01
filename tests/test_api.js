import axios from 'axios';

async function testInstagramAPI() {
  try {
    console.log('🧪 Testing Instagram processing through Node.js API...');
    
    const response = await axios.post('http://127.0.0.1:3000/api/memory/link', {
      url: 'https://www.instagram.com/reel/DKRIjpmspIN/',
      title: '',
      description: ''
    }, {
      timeout: 30000
    });
    
    console.log('✅ SUCCESS: Instagram processing worked!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.memory?.title?.includes('pizza')) {
      console.log('🍕 VERIFIED: Real Instagram data extracted (contains "pizza")');
    } else {
      console.log('⚠️ WARNING: May be using fallback data');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
  }
}

testInstagramAPI(); 
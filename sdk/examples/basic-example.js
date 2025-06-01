const KeeprSDK = require('../dist/index.js');

async function basicExample() {
  console.log('🚀 Keepr SDK - Basic Example\n');

  // Initialize SDK with local development endpoint
  const keepr = new KeeprSDK.default({
    endpoint: 'http://localhost:3000' // Your Keepr API endpoint
  });

  try {
    // Step 1: Initialize the SDK
    console.log('📡 Initializing SDK...');
    await keepr.initialize();
    console.log('✅ SDK initialized successfully\n');

    // Step 2: Create a text memory
    console.log('📝 Creating a text memory...');
    const textMemory = await keepr.createTextMemory(
      'I had a productive meeting with the engineering team today. We discussed the new search feature and decided to implement vector embeddings for better semantic search.',
      'Engineering Team Meeting',
      ['work', 'meeting', 'engineering', 'search']
    );
    console.log('✅ Text memory created with ID:', textMemory.id);

    // Step 3: Create an image memory
    console.log('\n🖼️  Creating an image memory...');
    const imageMemory = await keepr.createImageMemory(
      { imageUrl: 'https://picsum.photos/800/600' },
      'Random beautiful image from Picsum',
      'Sample Photo',
      ['photo', 'sample', 'beautiful']
    );
    console.log('✅ Image memory created with ID:', imageMemory.id);

    // Step 4: Create a link memory
    console.log('\n🔗 Creating a link memory...');
    const linkMemory = await keepr.createLinkMemory(
      'https://docs.pinecone.io/docs/overview',
      'Pinecone Documentation',
      'Comprehensive guide to using Pinecone vector database for semantic search and recommendations',
      ['documentation', 'pinecone', 'vector-db', 'reference']
    );
    console.log('✅ Link memory created with ID:', linkMemory.id);

    // Step 5: Search memories
    console.log('\n🔍 Searching for memories about "meeting"...');
    const searchResults = await keepr.searchMemories('meeting discussion', 5);
    console.log(`✅ Found ${searchResults.totalResults} memories matching "meeting discussion":`);
    
    searchResults.results.forEach((memory, index) => {
      console.log(`\n   ${index + 1}. ${memory.title || 'Untitled'}`);
      console.log(`      Content: ${memory.content.substring(0, 80)}...`);
      console.log(`      Score: ${memory.score.toFixed(3)}`);
      console.log(`      Created: ${memory.createdAt}`);
    });

    console.log('\n🎉 Basic example completed successfully!');

  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.error('Error type:', error.constructor.name);
    
    // Basic error handling tips
    if (error.message.includes('fetch')) {
      console.log('💡 Tip: Make sure your Keepr API server is running on localhost:3000');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Tip: Check if the API endpoint is correct and the server is accessible');
    }
  }
}

// Run the example
basicExample(); 
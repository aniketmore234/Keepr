import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Temporarily allow self-signed certificates - remove for production or if not needed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; 

dotenv.config();

async function testPineconeConnection() {
  if (!process.env.PINECONE_API_KEY) {
    console.error('Error: PINECONE_API_KEY is not set in .env file.');
    return;
  }

  const indexName = process.env.PINECONE_INDEX_NAME || 'keepr-v1nybwf';
  const indexHost = 'https://keepr-v1nybwf.svc.aped-4627-b74a.pinecone.io';
  
  console.log(`Attempting to connect to Pinecone index: ${indexName}`);
  console.log(`Using direct host: ${indexHost}`);
  console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'SET (first 5 chars: ' + process.env.PINECONE_API_KEY.substring(0,5) + '...)' : 'NOT SET');

  try {
    console.log('Initializing Pinecone client...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    console.log('Pinecone client initialized successfully.');

    console.log(`Getting index object with direct host...`);
    // Use the direct host approach
    const index = pinecone.index(indexName, indexHost);
    console.log('Successfully obtained index object with direct host.');

    console.log('Attempting to describe index stats...');
    const stats = await index.describeIndexStats();
    console.log('✅ Successfully connected to Pinecone index and fetched stats!');
    console.log('Index Stats:');
    console.log(`  - Total vectors: ${stats.totalVectorCount}`);
    console.log(`  - Dimensions: ${stats.dimension}`);
    console.log(`  - Index fullness: ${stats.indexFullness}`);
    console.log('  - Namespaces:', Object.keys(stats.namespaces || {}));

    // Test a simple query
    console.log('\nTesting a simple query...');
    const queryResponse = await index.query({
      vector: Array(768).fill(0.1), // Simple test vector
      topK: 1,
      includeMetadata: true
    });
    console.log('✅ Query test successful!');
    console.log(`Found ${queryResponse.matches?.length || 0} matches`);

  } catch (error) {
    console.error('❌ Pinecone connection test failed:');
    console.error('Error Name:', error.name || 'Unknown');
    console.error('Error Message:', error.message || 'No message');
    
    // More detailed error logging
    if (error.status) console.error('HTTP Status:', error.status);
    if (error.statusText) console.error('Status Text:', error.statusText);
    if (error.body) console.error('Error Body:', error.body);
    if (error.cause) console.error('Underlying Cause:', error.cause);
    
    console.error('\nFull error for debugging:', error);
  }
}

testPineconeConnection(); 
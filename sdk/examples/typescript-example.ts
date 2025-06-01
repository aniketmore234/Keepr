import KeeprSDK, { 
  CreateMemoryResponse, 
  SearchResponse, 
  ValidationError, 
  NetworkError,
  AuthenticationError 
} from '../src/index';

async function typescriptExample(): Promise<void> {
  console.log('🚀 Keepr SDK - TypeScript Example\n');

  const keepr = new KeeprSDK({
    endpoint: 'http://localhost:3000',
    // apiKey: 'your-api-key-here' // Uncomment if you have authentication
  });

  try {
    // Initialize SDK
    await keepr.initialize();
    console.log('✅ SDK initialized\n');

    // Example 1: Create different types of memories with type safety
    console.log('📝 Creating typed memories...\n');

    const textMemoryResponse: CreateMemoryResponse = await keepr.createTextMemory(
      'Learning TypeScript has significantly improved my development workflow and code quality.',
      'TypeScript Learning Journey',
      ['typescript', 'programming', 'development']
    );
    console.log('Text memory created:', textMemoryResponse.id);

    const linkMemoryResponse: CreateMemoryResponse = await keepr.createLinkMemory(
      'https://www.typescriptlang.org/docs/',
      'TypeScript Official Documentation',
      'The complete guide to TypeScript language features and compiler options',
      ['typescript', 'documentation', 'reference']
    );
    console.log('Link memory created:', linkMemoryResponse.id);

    // Example 2: Search with proper typing
    console.log('\n🔍 Searching memories...\n');
    
    const searchResponse: SearchResponse = await keepr.searchMemories('typescript programming', 3);
    console.log(`Found ${searchResponse.totalResults} memories for "${searchResponse.query}"`);

    searchResponse.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title} (score: ${result.score.toFixed(3)})`);
      console.log(`   ${result.content.substring(0, 100)}...`);
      console.log(`   Tags: ${result.tags?.join(', ') || 'No tags'}`);
    });

    console.log('\n🎉 TypeScript example completed successfully!');

  } catch (error) {
    // Proper error handling with type checking
    console.error('\n❌ An error occurred:');
    
    if (error instanceof ValidationError) {
      console.error('Validation Error:', error.message);
      console.log('💡 Check your input parameters and try again');
    } else if (error instanceof NetworkError) {
      console.error('Network Error:', error.message);
      console.error('Status Code:', error.statusCode);
      console.log('💡 Check your network connection and API endpoint');
    } else if (error instanceof AuthenticationError) {
      console.error('Authentication Error:', error.message);
      console.log('💡 Check your API key and permissions');
    } else {
      console.error('Unknown Error:', error);
    }
  }
}

// Example function showing error handling patterns
async function demonstrateErrorHandling(): Promise<void> {
  console.log('\n🛡️ Error Handling Demonstration\n');
  
  const keepr = new KeeprSDK();
  await keepr.initialize();

  // Demonstrate validation errors
  console.log('Testing validation errors...');
  
  try {
    await keepr.createTextMemory(''); // This will throw ValidationError
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('✅ Caught validation error:', error.message);
    }
  }

  try {
    await keepr.searchMemories('test', 0); // Invalid limit
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('✅ Caught limit validation error:', error.message);
    }
  }

  try {
    await keepr.createLinkMemory('not-a-url'); // Invalid URL
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('✅ Caught URL validation error:', error.message);
    }
  }
}

// Run examples
async function runExamples(): Promise<void> {
  await typescriptExample();
  await demonstrateErrorHandling();
}

runExamples().catch(console.error); 
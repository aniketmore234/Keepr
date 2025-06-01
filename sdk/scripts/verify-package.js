#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Keepr SDK Package...\n');

// Check required files
const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  '.npmignore',
  'dist/index.js',
  'dist/index.d.ts',
  'examples/basic-example.js',
  'examples/typescript-example.ts'
];

let allFilesExist = true;

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json structure
console.log('\n📦 Checking package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredFields = ['name', 'version', 'description', 'main', 'types', 'license', 'author'];
requiredFields.forEach(field => {
  if (packageJson[field]) {
    console.log(`✅ ${field}: ${packageJson[field]}`);
  } else {
    console.log(`❌ ${field} - MISSING`);
    allFilesExist = false;
  }
});

// Check if files array exists
if (packageJson.files && packageJson.files.length > 0) {
  console.log('✅ files array defined');
} else {
  console.log('❌ files array missing');
  allFilesExist = false;
}

// Check scripts
console.log('\n🔧 Checking scripts...');
const requiredScripts = ['build', 'test', 'prepare'];
requiredScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
  } else {
    console.log(`❌ ${script} script - MISSING`);
  }
});

// Test basic import
console.log('\n🧪 Testing SDK import...');
try {
  const SDK = require('../dist/index.js');
  if (SDK.default) {
    console.log('✅ SDK can be imported');
    
    // Test basic instantiation
    const keepr = new SDK.default();
    console.log('✅ SDK can be instantiated');
  } else {
    console.log('❌ SDK default export missing');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ SDK import failed:', error.message);
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 Package verification PASSED!');
  console.log('📦 Ready for publication');
  console.log('\nNext steps:');
  console.log('1. npm publish --dry-run (to test)');
  console.log('2. npm publish (to publish)');
} else {
  console.log('❌ Package verification FAILED!');
  console.log('Please fix the missing items above');
  process.exit(1);
}

console.log('\n📋 Package Summary:');
console.log(`   Name: ${packageJson.name}`);
console.log(`   Version: ${packageJson.version}`);
console.log(`   Main: ${packageJson.main}`);
console.log(`   Types: ${packageJson.types}`);
console.log(`   License: ${packageJson.license}`); 
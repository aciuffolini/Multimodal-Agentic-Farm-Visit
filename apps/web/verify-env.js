/**
 * Verify .env file configuration
 * Run: node verify-env.js
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env');
const envExamplePath = join(process.cwd(), '.env.example');

console.log('🔍 Checking .env file configuration...\n');

// Check if .env exists
if (!existsSync(envPath)) {
  console.log('❌ .env file does NOT exist');
  console.log('   Create it by running: create-env.bat or create-env.ps1\n');
  process.exit(1);
}

console.log('✅ .env file exists\n');

// Read .env file
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch (err) {
  console.log('❌ Error reading .env file:', err.message);
  process.exit(1);
}

// Check for required variables
const requiredVars = [
  'VITE_OPENAI_API_KEY',
  'VITE_RAG_SERVER_URL',
];

const optionalVars = [
  'VITE_API_URL',
];

console.log('📋 Checking environment variables:\n');

let allGood = true;

// Check required vars
for (const varName of requiredVars) {
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);
  
  if (match && match[1] && match[1].trim()) {
    const value = match[1].trim();
    // Mask API key for security
    if (varName.includes('API_KEY')) {
      const masked = value.substring(0, 7) + '...' + value.substring(value.length - 4);
      console.log(`✅ ${varName}: ${masked}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allGood = false;
  }
}

// Check optional vars
for (const varName of optionalVars) {
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);
  
  if (match) {
    const value = match[1].trim();
    if (value) {
      console.log(`⚠️  ${varName}: ${value} (optional)`);
    } else {
      console.log(`✅ ${varName}: (empty, using default)`);
    }
  } else {
    console.log(`⚠️  ${varName}: NOT SET (optional)`);
  }
}

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('\n✅ All required environment variables are set!');
  console.log('   Restart your dev server to load them.\n');
} else {
  console.log('\n❌ Some required variables are missing.');
  console.log('   Update your .env file and try again.\n');
  process.exit(1);
}


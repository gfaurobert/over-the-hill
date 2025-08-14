#!/usr/bin/env node

/**
 * Environment Variable Checker
 * Validates that all required environment variables are set
 */

const requiredEnvVars = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Your Supabase project URL',
    example: 'https://your-project-id.supabase.co'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Your Supabase anonymous/public key',
    example: 'eyJ...'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Your Supabase service role key (keep this secure!)',
    example: 'eyJ...',
    required: true,
    note: 'This is CRITICAL for session validation on page refresh'
  },
  {
    name: 'KEY_MATERIAL',
    description: 'Encryption key material for data privacy (minimum 32 characters)',
    example: 'your-secure-random-string-at-least-32-chars-long',
    required: true,
    note: 'This is CRITICAL for encrypting user data - use a secure random string'
  },

];

console.log('🔍 Checking environment variables...\n');

let allGood = true;
const missing = [];
const warnings = [];

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar.name];
  
  if (!value) {
    if (envVar.required) {
      missing.push(envVar);
      allGood = false;
      console.log(`❌ ${envVar.name}: MISSING (REQUIRED)`);
    } else {
      warnings.push(envVar);
      console.log(`⚠️  ${envVar.name}: Not set`);
    }
  } else {
    console.log(`✅ ${envVar.name}: Set`);
  }
}

if (missing.length > 0) {
  console.log('\n🚨 CRITICAL: Missing required environment variables!');
  console.log('\nThe following environment variables are required:');
  
  missing.forEach(envVar => {
    console.log(`\n📋 ${envVar.name}`);
    console.log(`   Description: ${envVar.description}`);
    console.log(`   Example: ${envVar.example}`);
    if (envVar.note) {
      console.log(`   Note: ${envVar.note}`);
    }
  });
  
  console.log('\n🔧 How to fix:');
  console.log('1. Go to your Supabase project dashboard: https://supabase.com/dashboard');
  console.log('2. Navigate to Settings > API');
  console.log('3. Copy the required keys');
  console.log('4. Set them in your environment:');
  
  if (process.env.NODE_ENV === 'production') {
    console.log('   - For production deployment, set these in your hosting platform');
    console.log('   - For PM2: Use ecosystem.config.js or set via PM2 env vars');
    console.log('   - For Docker: Use environment variables or .env file');
  } else {
    console.log('   - Create a .env.local file in your project root');
    console.log('   - Add the variables like: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(envVar => {
    console.log(`   ${envVar.name}: ${envVar.description}`);
  });
}

if (allGood) {
  console.log('\n🎉 All required environment variables are set!');
  process.exit(0);
} else {
  console.log('\n💥 Environment check failed. Please fix the missing variables above.');
  process.exit(1);
}
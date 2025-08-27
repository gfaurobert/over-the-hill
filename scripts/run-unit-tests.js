#!/usr/bin/env node

/**
 * Simple test runner for unit tests
 * Run with: node scripts/run-unit-tests.js
 */

const { execSync } = require('child_process')
const path = require('path')

console.log('🧪 Running CacheManager unit tests...\n')

try {
  // Run Jest tests for the cache service
  execSync('npx jest lib/services/cacheService.jest.test.ts --verbose', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  })
  
  console.log('\n✅ All tests passed!')
} catch (error) {
  console.error('\n❌ Tests failed!')
  process.exit(1)
}
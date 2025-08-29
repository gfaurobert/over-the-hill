#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate a unique cache version based on timestamp
const cacheVersion = `over-the-hill-v${Date.now()}`;

// Path to service worker file
const swPath = path.join(__dirname, '..', 'public', 'sw.js');

// Read the service worker file
let swContent = fs.readFileSync(swPath, 'utf8');

// Replace the cache name with new version
swContent = swContent.replace(
  /const CACHE_NAME = ['"]over-the-hill-v[\d]+['"];/,
  `const CACHE_NAME = '${cacheVersion}';`
);

// Write the updated content back
fs.writeFileSync(swPath, swContent, 'utf8');

console.log(`✅ Service Worker cache version updated to: ${cacheVersion}`);

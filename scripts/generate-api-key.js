#!/usr/bin/env node
/**
 * SENTINEL — API Key Generator
 * 
 * Generates cryptographically secure API keys for admin endpoints.
 * 
 * Usage:
 *   node generate-api-key.js
 *   node generate-api-key.js 5  # Generate 5 keys
 */

const crypto = require('crypto');

const count = parseInt(process.argv[2]) || 1;

console.log('\n🔑 SENTINEL API Key Generator\n');
console.log('Generated API keys (add to SENTINEL_API_KEYS in .env):\n');

for (let i = 0; i < count; i++) {
  const key = crypto.randomBytes(32).toString('hex');
  console.log(`  ${i + 1}. ${key}`);
}

console.log('\nAdd these to your .env file:');
console.log('SENTINEL_API_KEYS=key1,key2,key3\n');
console.log('Use in API requests:');
console.log('curl -H "X-Sentinel-API-Key: YOUR_KEY" http://localhost:3000/sentinel/block\n');

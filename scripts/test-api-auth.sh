#!/bin/bash
# SENTINEL API Authentication Test Script
#
# Tests API authentication and rate limiting functionality
# Run this after starting the server with: node server.js

echo "🔐 SENTINEL API Authentication Test"
echo "===================================="
echo ""

# Configuration
SERVER="http://localhost:3000"
VALID_KEY="test_key_12345"  # Replace with your actual API key from .env

echo "📝 Test 1: Block IP without API key (should fail with 401)"
curl -s -X POST "$SERVER/sentinel/block" \
  -H "Content-Type: application/json" \
  -d '{"ip": "1.2.3.4", "durationMs": 60000}' | jq .
echo ""

echo "📝 Test 2: Block IP with invalid API key (should fail with 401)"
curl -s -X POST "$SERVER/sentinel/block" \
  -H "X-Sentinel-API-Key: invalid_key_xyz" \
  -H "Content-Type: application/json" \
  -d '{"ip": "1.2.3.4", "durationMs": 60000}' | jq .
echo ""

echo "📝 Test 3: Block IP with valid API key (should succeed with 200)"
curl -s -X POST "$SERVER/sentinel/block" \
  -H "X-Sentinel-API-Key: $VALID_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ip": "1.2.3.4", "durationMs": 60000}' | jq .
echo ""

echo "📝 Test 4: Unblock IP with valid API key (should succeed with 200)"
curl -s -X POST "$SERVER/sentinel/unblock" \
  -H "X-Sentinel-API-Key: $VALID_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ip": "1.2.3.4"}' | jq .
echo ""

echo "📝 Test 5: Rate limiting test (send 11 requests, 11th should fail with 429)"
for i in {1..11}; do
  echo "Request $i:"
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$SERVER/sentinel/block" \
    -H "X-Sentinel-API-Key: $VALID_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"ip\": \"10.0.0.$i\", \"durationMs\": 60000}")
  
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")
  
  echo "  Status: $HTTP_CODE"
  echo "  Body: $BODY" | jq . 2>/dev/null || echo "  Body: $BODY"
  
  if [ "$HTTP_CODE" == "429" ]; then
    echo "  ✅ Rate limit triggered as expected"
    break
  fi
  
  sleep 0.1
done
echo ""

echo "📝 Test 6: View API usage stats (should succeed with 200)"
curl -s -X GET "$SERVER/sentinel/api-stats" \
  -H "X-Sentinel-API-Key: $VALID_KEY" | jq .
echo ""

echo "📝 Test 7: Public endpoint without API key (should succeed with 200)"
curl -s -X GET "$SERVER/sentinel/stats" | jq '.reqPerSec, .totalRequests, .blockedIPCount'
echo ""

echo "✅ API Authentication Tests Complete"
echo ""
echo "Note: If tests fail, ensure:"
echo "  1. Server is running (node server.js)"
echo "  2. SENTINEL_API_KEYS is set in .env"
echo "  3. VALID_KEY variable matches your .env key"

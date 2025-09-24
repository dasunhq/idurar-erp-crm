#!/bin/bash

# OAuth Token Implementation Test Script
# This script tests the OAuth token functionality

echo "🔐 Testing OAuth Token Implementation"
echo "======================================"

# Base URL
BASE_URL="http://localhost:5000"

echo ""
echo "1. Testing Google OAuth redirect..."
echo "Visit: $BASE_URL/api/auth/google"

echo ""
echo "2. Testing Facebook OAuth redirect..."
echo "Visit: $BASE_URL/api/auth/facebook"

echo ""
echo "3. Testing token refresh endpoint..."
echo "Test with: curl -X POST $BASE_URL/api/auth/refresh -H 'Content-Type: application/json' -d '{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}'"

echo ""
echo "4. Testing token verification endpoint..."
echo "Test with: curl -X POST $BASE_URL/api/auth/verify -H 'Content-Type: application/json' -d '{\"accessToken\":\"YOUR_ACCESS_TOKEN\"}'"

echo ""
echo "5. Testing token revocation endpoint..."
echo "Test with: curl -X POST $BASE_URL/api/auth/revoke -H 'Content-Type: application/json' -d '{\"refreshToken\":\"YOUR_REFRESH_TOKEN\",\"accessToken\":\"YOUR_ACCESS_TOKEN\"}'"

echo ""
echo "6. Testing Google OAuth token refresh..."
echo "Test with: curl -X POST $BASE_URL/api/auth/google/refresh-oauth -H 'Content-Type: application/json' -d '{\"userId\":\"USER_ID\"}'"

echo ""
echo "7. Testing Facebook OAuth token refresh..."
echo "Test with: curl -X POST $BASE_URL/api/auth/facebook/refresh-oauth -H 'Content-Type: application/json' -d '{\"userId\":\"USER_ID\"}'"

echo ""
echo "📋 Required Environment Variables:"
echo "- JWT_SECRET (required)"
echo "- JWT_REFRESH_SECRET (optional, falls back to JWT_SECRET)"
echo "- GOOGLE_CLIENT_ID (required for Google OAuth)"
echo "- GOOGLE_CLIENT_SECRET (required for Google OAuth)"
echo "- FACEBOOK_APP_ID (required for Facebook OAuth)"
echo "- FACEBOOK_APP_SECRET (required for Facebook OAuth)"
echo "- FRONTEND_URL (required for OAuth callbacks)"

echo ""
echo "🚀 To start testing:"
echo "1. Make sure your server is running on port 5000"
echo "2. Configure your OAuth apps with callback URLs:"
echo "   - Google: $BASE_URL/api/auth/google/callback"
echo "   - Facebook: $BASE_URL/api/auth/facebook/callback"
echo "3. Set up the environment variables"
echo "4. Test the OAuth flows by visiting the URLs above"

echo ""
echo "✅ Implementation includes:"
echo "- Access tokens (15 min expiry)"
echo "- Refresh tokens (7 day expiry)"
echo "- OAuth token storage and refresh"
echo "- Enhanced authentication middleware"
echo "- Automatic token cleanup"
echo "- Comprehensive error handling"
echo "- Security best practices"

echo ""
echo "📖 For detailed usage, see:"
echo "- /backend/OAUTH_TOKEN_IMPLEMENTATION.md"
echo "- /frontend/oauth-integration-example.js"
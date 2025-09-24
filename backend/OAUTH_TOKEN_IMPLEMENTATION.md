# OAuth Token Management Implementation

This implementation provides a complete access and refresh token system for Google and Facebook OAuth strategies in the IDURAR ERP/CRM application.

## Features

### 1. Enhanced Token Management
- **Access Tokens**: Short-lived JWT tokens (15 minutes) for API access
- **Refresh Tokens**: Long-lived JWT tokens (7 days) for token renewal
- **OAuth Tokens**: Platform-specific tokens stored securely for API calls

### 2. Database Schema Updates
- Added `oauthTokens` field to Admin model for storing Google/Facebook tokens
- Added `refreshTokens` array to AdminPassword model
- Added `lastTokenRefresh` timestamp tracking

### 3. Token Utilities (`/utils/tokenUtils.js`)
- `generateTokens(user)`: Creates access and refresh token pair
- `refreshAccessToken(refreshToken)`: Validates and creates new access token
- `verifyToken(token, isRefresh)`: Validates JWT tokens
- `generateSecureToken()`: Creates cryptographically secure random tokens

## API Endpoints

### Authentication Routes (`/routes/authRoutes.js`)

#### 1. Refresh Access Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "new_access_token",
    "accessTokenExpiresIn": 900000,
    "user": {
      "_id": "user_id",
      "name": "John",
      "surname": "Doe",
      "email": "john@example.com",
      "role": "owner"
    }
  }
}
```

#### 2. Revoke Token (Logout)
```http
POST /api/auth/revoke
Content-Type: application/json

{
  "refreshToken": "refresh_token_to_revoke",
  "accessToken": "access_token_to_revoke"
}
```

#### 3. Revoke All Tokens (Logout from all devices)
```http
POST /api/auth/revoke-all
Content-Type: application/json

{
  "refreshToken": "valid_refresh_token"
}
```

#### 4. Verify Token Status
```http
POST /api/auth/verify
Content-Type: application/json

{
  "accessToken": "token_to_verify"
}
```

### OAuth Token Refresh

#### Google OAuth Token Refresh
```http
POST /api/auth/google/refresh-oauth
Content-Type: application/json

{
  "userId": "user_object_id"
}
```

#### Facebook OAuth Token Refresh
```http
POST /api/auth/facebook/refresh-oauth
Content-Type: application/json

{
  "userId": "user_object_id"
}
```

## Middleware Usage

### Enhanced Authentication Middleware (`/middlewares/authMiddleware.js`)

#### 1. Required Authentication
```javascript
const { authenticate } = require('./middlewares/authMiddleware');

app.get('/api/protected-route', authenticate, (req, res) => {
  // req.user contains authenticated user
  res.json({ user: req.user });
});
```

#### 2. Role-based Authorization
```javascript
const { authenticate, authorize } = require('./middlewares/authMiddleware');

app.get('/api/admin-only', 
  authenticate, 
  authorize(['admin', 'owner']), 
  (req, res) => {
    // Only admin or owner can access
    res.json({ message: 'Admin area' });
  }
);
```

#### 3. Optional Authentication
```javascript
const { optionalAuth } = require('./middlewares/authMiddleware');

app.get('/api/public-route', optionalAuth, (req, res) => {
  // req.user is available if user is authenticated, null otherwise
  const isAuthenticated = !!req.user;
  res.json({ isAuthenticated });
});
```

## Frontend Integration

### 1. OAuth Login Flow
When users authenticate via Google/Facebook, they receive:
```json
{
  "_id": "user_id",
  "name": "John",
  "surname": "Doe",
  "role": "owner",
  "email": "john@example.com",
  "photo": "profile_photo_url",
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "accessTokenExpiresIn": 900000,
  "refreshTokenExpiresIn": 604800000,
  "authType": "google",
  "oauthTokens": {
    "accessToken": "google_access_token",
    "refreshToken": "google_refresh_token",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Token Storage (Frontend)
```javascript
// Store tokens securely
localStorage.setItem('accessToken', userData.accessToken);
localStorage.setItem('refreshToken', userData.refreshToken);

// Set up automatic token refresh
const setupTokenRefresh = () => {
  const expiresIn = userData.accessTokenExpiresIn;
  const refreshTime = expiresIn - 60000; // Refresh 1 minute before expiry
  
  setTimeout(async () => {
    await refreshToken();
    setupTokenRefresh(); // Setup next refresh
  }, refreshTime);
};
```

### 3. API Requests with Token
```javascript
// Add token to requests
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};

// Handle token expiration
const apiCallWithRetry = async (url, options = {}) => {
  let response = await apiCall(url, options);
  
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      response = await apiCall(url, options);
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }
  
  return response;
};
```

## Security Features

### 1. Token Rotation
- Access tokens expire every 15 minutes
- Refresh tokens expire after 7 days
- Old tokens are automatically cleaned up

### 2. Token Revocation
- Tokens can be revoked individually or all at once
- Database tracking prevents use of revoked tokens

### 3. OAuth Token Management
- Google and Facebook tokens stored securely
- Automatic refresh for expired OAuth tokens
- Separate expiry tracking for each platform

### 4. Session Management
- Maximum of 5 concurrent sessions per user
- Automatic cleanup of old sessions

## Environment Variables Required

Add these to your `.env` file:

```bash
# JWT Secrets
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key  # Optional, falls back to JWT_SECRET

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Frontend URL for OAuth callbacks
FRONTEND_URL=http://localhost:3000
```

## Installation

1. **Install required packages** (if not already installed):
```bash
npm install googleapis axios
```

2. **Update your app.js** to include the auth routes:
```javascript
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
```

3. **Update database** by running the application - Mongoose will automatically update the schema.

## Error Handling

The implementation includes comprehensive error handling with specific error codes:

- `TOKEN_REQUIRED`: No token provided
- `TOKEN_EXPIRED`: Access token has expired
- `TOKEN_INVALID`: Malformed or invalid token
- `TOKEN_REVOKED`: Token has been revoked
- `USER_NOT_FOUND`: User doesn't exist
- `USER_DISABLED`: User account is disabled
- `USER_REMOVED`: User account has been removed

## Testing

Test the implementation with tools like Postman or curl:

```bash
# Test OAuth login
curl "http://localhost:5000/api/auth/google"

# Test token refresh
curl -X POST "http://localhost:5000/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your_refresh_token"}'

# Test protected route
curl -X GET "http://localhost:5000/api/protected-route" \
  -H "Authorization: Bearer your_access_token"
```

This implementation provides a robust, secure, and scalable token management system for your IDURAR ERP/CRM application.
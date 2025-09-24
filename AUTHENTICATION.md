# OAuth Authentication Setup Guide

This guide provides step-by-step instructions for setting up Google and Facebook OAuth authentication in the Idurar ERP/CRM system.

## Table of Contents
1. [Google OAuth Setup](#google-oauth-setup)
2. [Facebook OAuth Setup](#facebook-oauth-setup)
3. [Environment Configuration](#environment-configuration)
4. [Testing Instructions](#testing-instructions)
5. [Production Deployment Notes](#production-deployment-notes)

## Google OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Google+ API" or "Google OAuth2 API"

### Step 2: Create OAuth 2.0 Credentials
1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Select "Web application" as the application type

### Step 3: Configure Authorized Domains
In the "Authorized JavaScript origins" field, add:
```
http://localhost:3000
http://localhost:8888
https://yourdomain.com
```

### Step 4: Configure Redirect URIs
In the "Authorized redirect URIs" field, add:
```
http://localhost:8888/api/auth/google/callback
https://yourdomain.com/api/auth/google/callback
```

### Step 5: Get Credentials
After creating the credentials, copy the following values:
- **Client ID**: Your Google OAuth Client ID
- **Client Secret**: Your Google OAuth Client Secret

## Facebook OAuth Setup

### Step 1: Create Facebook App
1. Go to the [Facebook Developers](https://developers.facebook.com/) site
2. Create a new app or select an existing one

### Step 2: Add Facebook Login Product
1. In your app dashboard, click "Add Product"
2. Select "Facebook Login"

### Step 3: Configure Valid OAuth Redirect URIs
In the Facebook Login settings, under "Valid OAuth Redirect URIs", add:
```
http://localhost:8888/api/auth/facebook/callback
https://yourdomain.com/api/auth/facebook/callback
```

### Step 4: Configure App Domains
In App Settings → Basic, add the following domains:
```
localhost
yourdomain.com
```

### Step 5: Get App Credentials
Copy the following values from your Facebook app dashboard:
- **App ID**: Your Facebook App ID
- **App Secret**: Your Facebook App Secret

## Environment Configuration

### Step 1: Update .env File
Copy the example environment file and add your credentials:
```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env` and replace the placeholder values with your actual credentials:
```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
FACEBOOK_APP_ID=your_actual_facebook_app_id
FACEBOOK_APP_SECRET=your_actual_facebook_app_secret
FRONTEND_URL=http://localhost:3000
```

**Note**: The `.env` file is gitignored and should never be committed to version control.

### Step 2: Verify .env.example
Ensure your `backend/.env.example` file includes these variables (without actual values):
```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FRONTEND_URL=http://localhost:3000
```

## Testing Instructions

### Local Development Testing

#### Google OAuth Test
1. Start both backend and frontend servers
2. Navigate to the login page
3. Click the "Google" button
4. You should be redirected to Google's authentication page
5. After authentication, you should be redirected back to your application and logged in

#### Facebook OAuth Test
1. Start both backend and frontend servers
2. Navigate to the login page
3. Click the "Facebook" button
4. You should be redirected to Facebook's authentication page
5. After authentication, you should be redirected back to your application and logged in

### Test Scenarios

| Scenario | Expected Result |
|--------|----------------|
| New user with Google account | Account created, user logged in |
| Existing user with Google account | User logged in with existing account |
| New user with Facebook account | Account created, user logged in |
| Existing user with Facebook account | User logged in with existing account |
| Failed Google authentication | Redirected to login with error message |
| Failed Facebook authentication | Redirected to login with error message |

## Production Deployment Notes

### Domain Configuration
When deploying to production:
1. Replace `yourdomain.com` with your actual domain name in all configurations
2. Update the authorized domains and redirect URIs in both Google Cloud Console and Facebook Developer Console

### Security Considerations
1. Never commit your `.env` file to version control
2. Use different OAuth credentials for development and production environments
3. Regularly rotate your OAuth secrets
4. Monitor authentication logs for suspicious activity

### Troubleshooting

**Issue**: Redirect URI mismatch
- **Solution**: Verify that the redirect URI in your code matches exactly with what is configured in Google/Facebook developer consoles

**Issue**: CORS errors
- **Solution**: Ensure your frontend URL is included in the CORS configuration in `app.js`

**Issue**: Users not being created
- **Solution**: Check MongoDB connection and ensure the Admin model has the googleId/facebookId fields

**Issue**: Authentication succeeds but user is not logged in
- **Solution**: Verify the JWT token is being properly generated and the frontend is correctly handling the redirect with the token parameter

For additional support, refer to the official documentation:
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
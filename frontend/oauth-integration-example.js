// Example Frontend Integration for OAuth Token Management

// 1. Token Storage and Management
class TokenManager {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.refreshTimeout = null;
  }

  // Store tokens after OAuth login
  setTokens(userData) {
    this.accessToken = userData.accessToken;
    this.refreshToken = userData.refreshToken;
    
    localStorage.setItem('accessToken', userData.accessToken);
    localStorage.setItem('refreshToken', userData.refreshToken);
    
    // Set up automatic refresh
    this.scheduleTokenRefresh(userData.accessTokenExpiresIn);
  }

  // Schedule automatic token refresh
  scheduleTokenRefresh(expiresIn) {
    // Refresh 1 minute before expiry
    const refreshTime = expiresIn - 60000;
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    this.refreshTimeout = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshTime);
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.data.accessToken;
        localStorage.setItem('accessToken', data.data.accessToken);
        
        // Schedule next refresh
        this.scheduleTokenRefresh(data.data.accessTokenExpiresIn);
        
        return true;
      } else {
        // Refresh failed, redirect to login
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return false;
    }
  }

  // Logout - revoke tokens
  async logout() {
    try {
      await fetch('/api/auth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
          accessToken: this.accessToken
        })
      });
    } catch (error) {
      console.error('Token revocation failed:', error);
    }

    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Clear timeouts
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    // Redirect to login
    window.location.href = '/login';
  }

  // Get current access token
  getAccessToken() {
    return this.accessToken;
  }
}

// 2. API Client with automatic token refresh
class ApiClient {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
    this.baseURL = '/api';
  }

  // Make API request with automatic token refresh
  async request(url, options = {}) {
    const token = this.tokenManager.getAccessToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add token if available
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${this.baseURL}${url}`, config);

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshed = await this.tokenManager.refreshAccessToken();
      
      if (refreshed) {
        // Retry with new token
        config.headers['Authorization'] = `Bearer ${this.tokenManager.getAccessToken()}`;
        response = await fetch(`${this.baseURL}${url}`, config);
      } else {
        // Refresh failed, user needs to login
        throw new Error('Authentication required');
      }
    }

    return response;
  }

  // GET request
  async get(url) {
    return this.request(url, { method: 'GET' });
  }

  // POST request
  async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }
}

// 3. OAuth Login Handler
class OAuthHandler {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
  }

  // Handle OAuth callback
  handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    
    if (data) {
      try {
        const userData = JSON.parse(decodeURIComponent(data));
        this.tokenManager.setTokens(userData);
        
        // Remove query parameters and redirect to dashboard
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Failed to parse OAuth callback data:', error);
        window.location.href = '/login?error=callback_failed';
      }
    }
  }

  // Initiate Google OAuth
  loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  // Initiate Facebook OAuth
  loginWithFacebook() {
    window.location.href = '/api/auth/facebook';
  }
}

// 4. Usage Example
document.addEventListener('DOMContentLoaded', () => {
  const tokenManager = new TokenManager();
  const apiClient = new ApiClient(tokenManager);
  const oauthHandler = new OAuthHandler(tokenManager);

  // Check if this is an OAuth callback
  if (window.location.search.includes('data=')) {
    oauthHandler.handleCallback();
    return;
  }

  // Set up OAuth login buttons
  const googleLoginBtn = document.getElementById('google-login');
  const facebookLoginBtn = document.getElementById('facebook-login');
  const logoutBtn = document.getElementById('logout');

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      oauthHandler.loginWithGoogle();
    });
  }

  if (facebookLoginBtn) {
    facebookLoginBtn.addEventListener('click', () => {
      oauthHandler.loginWithFacebook();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      tokenManager.logout();
    });
  }

  // Example API calls
  async function fetchUserProfile() {
    try {
      const response = await apiClient.get('/admin/profile');
      const data = await response.json();
      console.log('User profile:', data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }

  // Auto-fetch profile if user is logged in
  if (tokenManager.getAccessToken()) {
    fetchUserProfile();
  }
});

// 5. React Hook Example
/*
import { useState, useEffect, useCallback } from 'react';

export const useAuth = () => {
  const [tokenManager] = useState(() => new TokenManager());
  const [apiClient] = useState(() => new ApiClient(tokenManager));
  const [isAuthenticated, setIsAuthenticated] = useState(!!tokenManager.getAccessToken());
  const [user, setUser] = useState(null);

  const login = useCallback((userData) => {
    tokenManager.setTokens(userData);
    setIsAuthenticated(true);
    setUser(userData);
  }, [tokenManager]);

  const logout = useCallback(() => {
    tokenManager.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, [tokenManager]);

  const refreshToken = useCallback(async () => {
    const success = await tokenManager.refreshAccessToken();
    if (!success) {
      setIsAuthenticated(false);
      setUser(null);
    }
    return success;
  }, [tokenManager]);

  useEffect(() => {
    // Verify token on app start
    if (isAuthenticated) {
      apiClient.get('/auth/verify')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setUser(data.data.user);
          } else {
            logout();
          }
        })
        .catch(() => logout());
    }
  }, [isAuthenticated, apiClient, logout]);

  return {
    isAuthenticated,
    user,
    login,
    logout,
    refreshToken,
    apiClient
  };
};
*/
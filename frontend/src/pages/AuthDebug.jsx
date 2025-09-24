import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Space, Divider, Alert } from 'antd';
import storePersist from '@/redux/storePersist';
import { request } from '@/request';

const { Title, Text, Paragraph } = Typography;

const AuthDebug = () => {
  const [authData, setAuthData] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current auth data
    const auth = storePersist.get('auth');
    setAuthData(auth);
  }, []);

  const testApiCall = async () => {
    setLoading(true);
    try {
      // Try to make an authenticated API call
      const response = await request.read({ entity: 'admin/profile' });
      setTestResult({ success: true, data: response });
    } catch (error) {
      setTestResult({ success: false, error: error.message || error });
    }
    setLoading(false);
  };

  const clearAuth = () => {
    window.localStorage.removeItem('auth');
    window.localStorage.removeItem('isLogout');
    setAuthData(null);
    setTestResult(null);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>OAuth Authentication Debug</Title>
      
      {/* Authentication Status */}
      <Card title="Authentication Status" style={{ marginBottom: '20px' }}>
        {authData ? (
          <div>
            <Alert type="success" message="User is authenticated" style={{ marginBottom: '16px' }} />
            <Paragraph>
              <strong>User ID:</strong> {authData.current?._id}
            </Paragraph>
            <Paragraph>
              <strong>Email:</strong> {authData.current?.email}
            </Paragraph>
            <Paragraph>
              <strong>Name:</strong> {authData.current?.name} {authData.current?.surname}
            </Paragraph>
            <Paragraph>
              <strong>Role:</strong> {authData.current?.role}
            </Paragraph>
            <Paragraph>
              <strong>Auth Type:</strong> {authData.current?.authType || 'email'}
            </Paragraph>
            <Paragraph>
              <strong>Has Token:</strong> {authData.current?.token ? 'Yes' : 'No'}
            </Paragraph>
            {authData.current?.token && (
              <Paragraph>
                <strong>Token Preview:</strong> 
                <Text code>{authData.current.token.substring(0, 50)}...</Text>
              </Paragraph>
            )}
            <Paragraph>
              <strong>Is Logged In:</strong> {authData.isLoggedIn ? 'Yes' : 'No'}
            </Paragraph>
          </div>
        ) : (
          <Alert type="warning" message="No authentication data found" />
        )}
      </Card>

      {/* Token Details */}
      {authData?.current && (
        <Card title="Token Details" style={{ marginBottom: '20px' }}>
          <Paragraph>
            <strong>Standard Token:</strong> 
            {authData.current.token ? (
              <Text code style={{ wordBreak: 'break-all', display: 'block', marginTop: '8px' }}>
                {authData.current.token}
              </Text>
            ) : (
              <Text type="danger"> Not found</Text>
            )}
          </Paragraph>
          
          {authData.current.accessToken && (
            <Paragraph>
              <strong>Access Token:</strong>
              <Text code style={{ wordBreak: 'break-all', display: 'block', marginTop: '8px' }}>
                {authData.current.accessToken}
              </Text>
            </Paragraph>
          )}
          
          {authData.current.refreshToken && (
            <Paragraph>
              <strong>Refresh Token:</strong>
              <Text code style={{ wordBreak: 'break-all', display: 'block', marginTop: '8px' }}>
                {authData.current.refreshToken.substring(0, 100)}...
              </Text>
            </Paragraph>
          )}

          {authData.current.oauthTokens && (
            <Paragraph>
              <strong>OAuth Tokens:</strong>
              <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                {JSON.stringify(authData.current.oauthTokens, null, 2)}
              </pre>
            </Paragraph>
          )}
        </Card>
      )}

      {/* Test API Call */}
      <Card title="API Test" style={{ marginBottom: '20px' }}>
        <Paragraph>
          Test if the current authentication token works for API calls:
        </Paragraph>
        
        <Space>
          <Button type="primary" onClick={testApiCall} loading={loading}>
            Test API Call
          </Button>
          <Button onClick={() => setTestResult(null)}>
            Clear Results
          </Button>
        </Space>

        {testResult && (
          <div style={{ marginTop: '16px' }}>
            {testResult.success ? (
              <Alert 
                type="success" 
                message="API call successful!" 
                description={
                  <pre style={{ marginTop: '8px' }}>
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                }
              />
            ) : (
              <Alert 
                type="error" 
                message="API call failed!" 
                description={
                  <div>
                    <Text>Error: {testResult.error}</Text>
                    <Paragraph style={{ marginTop: '8px' }}>
                      This usually means the token is invalid, expired, or not properly formatted.
                    </Paragraph>
                  </div>
                }
              />
            )}
          </div>
        )}
      </Card>

      {/* Debug Actions */}
      <Card title="Debug Actions">
        <Space>
          <Button onClick={refreshPage}>
            Refresh Page
          </Button>
          <Button danger onClick={clearAuth}>
            Clear Authentication
          </Button>
          <Button onClick={() => window.open('/api/auth/google', '_blank')}>
            Test Google OAuth
          </Button>
          <Button onClick={() => window.open('/api/auth/facebook', '_blank')}>
            Test Facebook OAuth
          </Button>
        </Space>
      </Card>

      {/* Instructions */}
      <Card title="Testing Instructions" style={{ marginTop: '20px' }}>
        <Paragraph>
          <strong>To test OAuth login:</strong>
        </Paragraph>
        <ol>
          <li>Click "Clear Authentication" to reset</li>
          <li>Click "Test Google OAuth" or "Test Facebook OAuth"</li>
          <li>Complete the OAuth flow</li>
          <li>You should be redirected back here</li>
          <li>Check if authentication data is properly stored</li>
          <li>Click "Test API Call" to verify the token works</li>
        </ol>
        
        <Divider />
        
        <Paragraph>
          <strong>Expected behavior:</strong>
        </Paragraph>
        <ul>
          <li>After OAuth login, you should see authentication data above</li>
          <li>The "Standard Token" should be present and valid</li>
          <li>API test should return success with user profile data</li>
          <li>If any step fails, check browser console for errors</li>
        </ul>
      </Card>
    </div>
  );
};

export default AuthDebug;
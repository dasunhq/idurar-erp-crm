import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as actionTypes from '@/redux/auth/types';

const AuthCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    // Get data from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    const error = urlParams.get('error');

    if (error) {
      // Handle error
      navigate('/login?error=' + error);
      return;
    }

    if (data) {
      try {
        // Parse the encoded user data
        const userData = JSON.parse(decodeURIComponent(data));
        
        // Debug: Log the received data
        console.log('OAuth callback received userData:', userData);
        console.log('Token in userData:', userData.token);
        
        // Store auth state directly
        const auth_state = {
          current: userData,
          isLoggedIn: true,
          isLoading: false,
          isSuccess: true,
        };
        
        console.log('Storing auth_state:', auth_state);
        console.log('Token that will be used for API calls:', auth_state.current.token);
        
        window.localStorage.setItem('auth', JSON.stringify(auth_state));
        window.localStorage.removeItem('isLogout');
        
        // Dispatch success action
        dispatch({
          type: actionTypes.REQUEST_SUCCESS,
          payload: userData,
        });
        
        // Clean up URL and redirect to dashboard
        window.history.replaceState({}, document.title, "/");
        navigate('/');
      } catch (error) {
        console.error('Error parsing OAuth data:', error);
        navigate('/login?error=auth_parse_failed');
      }
    } else {
      // No data found
      navigate('/login?error=auth_failed');
    }
  }, [dispatch, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '16px'
    }}>
      Processing authentication...
    </div>
  );
};

export default AuthCallback;

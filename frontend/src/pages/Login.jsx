import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import useLanguage from '@/locale/useLanguage';

import { Form, Button, Divider, notification } from 'antd';
import { LoginOutlined, GoogleOutlined, FacebookOutlined } from '@ant-design/icons';

import { login } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';
import LoginForm from '@/forms/LoginForm';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';

const LoginPage = () => {
  const translate = useLanguage();
  const { isLoading, isSuccess } = useSelector(selectAuth);
  const navigate = useNavigate();
  // const size = useSize();

  const dispatch = useDispatch();
  const onFinish = (values) => {
    dispatch(login({ loginData: values }));
  };

  useEffect(() => {
    if (isSuccess) navigate('/');
    
    // Handle OAuth error messages
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      let message = 'Authentication failed. Please try again.';
      if (error === 'google_auth_failed') {
        message = 'Google authentication failed. Please try again.';
      } else if (error === 'facebook_auth_failed') {
        message = 'Facebook authentication failed. Please try again.';
      } else if (error === 'auth_parse_failed') {
        message = 'Authentication data parsing failed. Please try again.';
      }
      notification.error({
        message: 'Authentication Error',
        description: message,
      });
      // Clean up URL
      window.history.replaceState({}, document.title, '/login');
    }
  }, [isSuccess, navigate]);

  const FormContainer = () => {
    return (
      <Loading isLoading={isLoading}>
        <Form
          layout="vertical"
          name="normal_login"
          className="login-form"
          initialValues={{
            remember: true,
          }}
          onFinish={onFinish}
        >
          <LoginForm />
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              loading={isLoading}
              size="large"
            >
              <LoginOutlined /> {translate('Log in')}
            </Button>
          </Form.Item>

          <Divider>
            {translate('Or')} {translate('sign_in_with')}
          </Divider>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              type="default"
              className="login-form-button"
              size="large"
              icon={<GoogleOutlined />}
              onClick={() => (window.location.href = 'http://localhost:8888/api/auth/google')}
              style={{ flex: 1 }}
            >
              {translate('Google')}
            </Button>
            <Button
              type="default"
              className="login-form-button"
              size="large"
              icon={<FacebookOutlined />}
              onClick={() => (window.location.href = 'http://localhost:8888/api/auth/facebook')}
              style={{ flex: 1 }}
            >
              {translate('Facebook')}
            </Button>
          </div>
        </Form>
      </Loading>
    );
  };

  return <AuthModule authContent={<FormContainer />} AUTH_TITLE="Sign in" />;
};

export default LoginPage;

/**
 * Login Page Component
 * Handles user authentication with email/password
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  message,
  Card,
  Space,
  Checkbox,
} from 'antd';
import {
  MailOutlined,
  LockOutlined,
  GoogleOutlined,
  FacebookOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { extractErrorMessage } from '@/shared/utils/error';
import Logo from '@/components/Logo';

const { Text, Paragraph } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or default to home
  const from = (location.state as { from?: string })?.from || '/';

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success(t('auth.welcomeBack'));
      navigate(from, { replace: true });
    } catch (error: unknown) {
      message.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    message.info(t('auth.googleSoon'));
  };

  const handleFacebookLogin = () => {
    message.info(t('auth.facebookSoon'));
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
      padding: '24px',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          borderRadius: 12,
        }}
        styles={{ body: { padding: 32 } }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-block' }}>
            <Logo variant="dark" height={36} />
          </Link>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {t('auth.signInToAccount')}
          </Paragraph>
        </div>

        {/* Login Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          initialValues={{ remember: true }}
        >
          <Form.Item
            name="email"
            label={t('auth.email')}
            rules={[
              { required: true, message: t('auth.enterEmail') },
              { type: 'email', message: t('auth.invalidEmail') },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="you@example.com"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[
              { required: true, message: t('auth.enterPassword') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={t('auth.enterPassword')}
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>{t('auth.rememberMe')}</Checkbox>
              </Form.Item>
              <Link to="/forgot-password">
                <Text type="secondary" style={{ fontSize: 13 }}>{t('auth.forgotPassword')}</Text>
              </Link>
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              {t('auth.signIn')}
            </Button>
          </Form.Item>
        </Form>

        {/* OAuth Divider */}
        <Divider plain>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('auth.orContinueWith')}</Text>
        </Divider>

        {/* OAuth Buttons */}
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Button
            size="large"
            block
            icon={<GoogleOutlined />}
            onClick={handleGoogleLogin}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {t('auth.continueWithGoogle')}
          </Button>
          <Button
            size="large"
            block
            icon={<FacebookOutlined />}
            onClick={handleFacebookLogin}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {t('auth.continueWithFacebook')}
          </Button>
        </Space>

        {/* Register Link */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary">
            {t('auth.noAccount')}{' '}
            <Link to="/register" style={{ fontWeight: 500 }}>
              {t('auth.createAccount')}
            </Link>
          </Text>
        </div>

      </Card>
    </div>
  );
};

export default LoginPage;

/**
 * Forgot Password Page Component
 * Handles password reset request flow
 * 
 * TODO: API Integration
 * - Connect to your password reset endpoint
 * - Implement rate limiting for security
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Form, Input, Button, Card, Result, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text, Paragraph } = Typography;

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      await forgotPassword(values.email);
      setSubmitted(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('auth.failedResetEmail');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
          <Result
            status="success"
            title={t('auth.checkYourEmail')}
            subTitle={t('auth.resetEmailSent')}
            extra={
              <Link to="/login">
                <Button type="primary" size="large">{t('auth.backToLogin')}</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

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
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <ArrowLeftOutlined />
          <Text>{t('auth.backToLogin')}</Text>
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>{t('auth.resetPassword')}</Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {t('auth.resetPasswordDescription')}
          </Paragraph>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
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

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              {t('auth.sendResetLink')}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary">
            {t('auth.rememberPassword')}{' '}
            <Link to="/login" style={{ fontWeight: 500 }}>
              {t('auth.signIn')}
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;

import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Typography, Form, Input, Button, Card, Result, message } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useResetPasswordMutation } from '@/features/auth/api';
import { extractErrorMessage } from '@/shared/utils/error';

const { Title, Text, Paragraph } = Typography;

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resetPassword] = useResetPasswordMutation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  if (!token || !email) {
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
          style={{ width: '100%', maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', borderRadius: 12 }}
          styles={{ body: { padding: 32 } }}
        >
          <Result
            status="error"
            title={t('auth.invalidResetLink')}
            subTitle={t('auth.invalidResetLinkDescription')}
            extra={
              <Link to="/forgot-password">
                <Button type="primary" size="large">{t('auth.requestNewLink')}</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      await resetPassword({
        token,
        email,
        password: values.password,
        passwordConfirmation: values.confirmPassword,
      }).unwrap();
      setSuccess(true);
    } catch (error: unknown) {
      message.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          style={{ width: '100%', maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', borderRadius: 12 }}
          styles={{ body: { padding: 32 } }}
        >
          <Result
            status="success"
            title={t('auth.passwordResetSuccess')}
            subTitle={t('auth.passwordResetSuccessDescription')}
            extra={
              <Button type="primary" size="large" onClick={() => navigate('/login')}>
                {t('auth.signIn')}
              </Button>
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
        style={{ width: '100%', maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', borderRadius: 12 }}
        styles={{ body: { padding: 32 } }}
      >
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <ArrowLeftOutlined />
          <Text>{t('auth.backToLogin')}</Text>
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>{t('auth.setNewPassword')}</Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {t('auth.setNewPasswordDescription')}
          </Paragraph>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[
              { required: true, message: t('auth.enterPassword') },
              { min: 8, message: t('auth.passwordMin') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="••••••••"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('auth.confirmPassword')}
            dependencies={['password']}
            rules={[
              { required: true, message: t('auth.confirmYourPassword') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('auth.passwordsNoMatch')));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="••••••••"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              {t('auth.resetPassword')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;

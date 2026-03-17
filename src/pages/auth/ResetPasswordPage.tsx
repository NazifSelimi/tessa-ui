/**
 * Reset Password Page
 * Handles the actual password reset using token + email from the URL.
 * Linked from the password reset email.
 */

import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Typography, Form, Input, Button, Card, Result, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useResetPasswordMutation } from '@/features/auth/api';
import Logo from '@/components/Logo';

const { Paragraph } = Typography;

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resetPassword] = useResetPasswordMutation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

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
            title="Invalid Reset Link"
            subTitle="This password reset link is invalid or has expired. Please request a new one."
            extra={
              <Link to="/forgot-password">
                <Button type="primary" size="large">Request New Link</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

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
            title="Password Reset Successfully"
            subTitle="Your password has been updated. You can now sign in with your new password."
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
      const msg = error instanceof Error ? error.message : 'Failed to reset password. The link may have expired.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
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
        style={{ width: '100%', maxWidth: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', borderRadius: 12 }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-block' }}>
            <Logo variant="dark" height={36} />
          </Link>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            Choose a new password for your account
          </Paragraph>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="password"
            label={t('account.newPassword')}
            rules={[
              { required: true, message: t('account.enterNewPassword') },
              { min: 8, message: t('auth.passwordMin') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={t('account.enterNewPassword')}
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('account.confirmNewPassword')}
            dependencies={['password']}
            rules={[
              { required: true, message: t('account.confirmNewPasswordMsg') },
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
              placeholder={t('account.confirmNewPasswordMsg')}
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

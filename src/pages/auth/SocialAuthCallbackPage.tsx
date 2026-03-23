import { useEffect, useRef } from 'react';
import { Card, Spin, Typography, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '@/features/auth/slice';
import type { User } from '@/types';
import { isProfileComplete } from '@/features/auth/profile';

const { Paragraph, Title } = Typography;

function decodeUserPayload(value: string): User | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(window.atob(padded)) as User;
  } catch {
    return null;
  }
}

function parseHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
}

function mergeParams(): URLSearchParams {
  const merged = new URLSearchParams(window.location.search);
  const hashParams = parseHashParams(window.location.hash);

  hashParams.forEach((value, key) => {
    merged.set(key, value);
  });

  return merged;
}

export default function SocialAuthCallbackPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (location.pathname !== '/auth/social/callback') {
      return;
    }

    if (hasProcessedRef.current) {
      return;
    }

    const params = mergeParams();
    const error = params.get('error');
    const token = params.get('token');
    const encodedUser = params.get('user');
    const redirect = params.get('redirect') || '/';
    const accountType = params.get('account_type') === 'stylist' ? 'stylist' : 'customer';

    if (error) {
      hasProcessedRef.current = true;
      message.error(error);
      navigate('/login', { replace: true });
      return;
    }

    if (!token || !encodedUser) {
      hasProcessedRef.current = true;
      message.error('Social login could not be completed.');
      navigate('/login', { replace: true });
      return;
    }

    const user = decodeUserPayload(encodedUser);

    if (!user) {
      hasProcessedRef.current = true;
      message.error('Could not read the social login response.');
      navigate('/login', { replace: true });
      return;
    }

    hasProcessedRef.current = true;
    dispatch(setCredentials({ user, token }));
    message.success('Signed in successfully.');
    navigate(
      isProfileComplete(user)
        ? redirect
        : `/complete-profile?continue=${encodeURIComponent(redirect)}&account_type=${encodeURIComponent(accountType)}`,
      { replace: true }
    );
  }, [dispatch, location.pathname, navigate]);

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
          textAlign: 'center',
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Spin size="large" />
        <Title level={4} style={{ marginTop: 24, marginBottom: 8 }}>
          Finishing sign-in
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          We&apos;re connecting your social account to Tessa.
        </Paragraph>
      </Card>
    </div>
  );
}

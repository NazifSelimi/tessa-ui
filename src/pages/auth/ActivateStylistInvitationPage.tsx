import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Spin, Typography, message } from 'antd';
import { LockOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '@/features/auth/slice';
import type { User } from '@/types';
import AuthPageHeader from '@/components/AuthPageHeader';
import { resolveActivationField } from '@/shared/utils/activationFields';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;
const { Paragraph, Title, Text } = Typography;

interface InvitationDetails {
  display_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  business_name: string | null;
  business_address: string | null;
  business_city: string | null;
  business_phone: string | null;
  missing_fields: string[];
}

interface ActivationValues {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  business_name?: string;
  business_address?: string;
  business_city?: string;
  business_phone?: string;
  password: string;
  password_confirmation: string;
}

function splitSuggestedName(displayName: string): Pick<ActivationValues, 'first_name' | 'last_name'> {
  const [firstName = '', ...lastName] = displayName.trim().split(/\s+/);
  return { first_name: firstName, last_name: lastName.join(' ') };
}

export default function ActivateStylistInvitationPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<ActivationValues>();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const response = await fetch(`${API_BASE_URL}/v1/stylist-invitations/${token}`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'This activation link is unavailable.');

        const details = payload.data as InvitationDetails;
        setInvitation(details);
        form.setFieldsValue({
          ...splitSuggestedName(details.display_name),
          email: details.email ?? undefined,
          phone: details.phone ?? undefined,
          address: details.address ?? undefined,
          city: details.city ?? undefined,
          postal_code: details.postal_code ?? undefined,
          business_name: details.business_name ?? details.display_name,
          business_address: details.business_address ?? details.address ?? undefined,
          business_city: details.business_city ?? details.city ?? undefined,
          business_phone: details.business_phone ?? details.phone ?? undefined,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'This activation link is unavailable.');
      } finally {
        setLoading(false);
      }
    }

    void loadInvitation();
  }, [form, token]);

  const needs = (field: string) => invitation?.missing_fields.includes(field) ?? false;

  const handleSubmit = async (values: ActivationValues) => {
    if (!invitation) return;

    setSubmitting(true);
    try {
      const payload = {
        ...values,
        email: resolveActivationField(values.email, invitation.email),
        phone: resolveActivationField(values.phone, invitation.phone),
        address: resolveActivationField(values.address, invitation.address),
        city: resolveActivationField(values.city, invitation.city),
        postal_code: resolveActivationField(values.postal_code, invitation.postal_code),
        business_name: resolveActivationField(values.business_name, invitation.business_name),
        business_address: resolveActivationField(values.business_address, invitation.business_address),
        business_city: resolveActivationField(values.business_city, invitation.business_city),
        business_phone: resolveActivationField(values.business_phone, invitation.business_phone),
      };
      const response = await fetch(`${API_BASE_URL}/v1/stylist-invitations/${token}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'We could not activate your account.');

      dispatch(setCredentials({ token: result.data.token, user: result.data.user as User }));
      message.success('Your stylist account is ready.');
      navigate('/stylist/workspace', { replace: true });
    } catch (submitError) {
      message.error(submitError instanceof Error ? submitError.message : 'We could not activate your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AuthPageHeader />
      <Card style={{ width: '100%', maxWidth: 560, borderRadius: 16 }} styles={{ body: { padding: 32 } }}>
        {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}
        {!loading && error && <Alert type="error" showIcon message="Invitation unavailable" description={error} />}
        {!loading && invitation && (
          <>
            <Title level={2} style={{ marginBottom: 8 }}>Set up your stylist account</Title>
            <Paragraph type="secondary">Welcome, {invitation.display_name}. We have prefilled the details we already know. Add only the missing information below, then choose your password.</Paragraph>
            <Alert type="info" showIcon icon={<ShopOutlined />} message="Professional account" description="Your stylist pricing and quick ordering will be available as soon as you finish setup." style={{ marginBottom: 20 }} />
            <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item name="first_name" label="First name" rules={[{ required: true, message: 'Enter your first name.' }]}>
                <Input prefix={<UserOutlined />} autoComplete="given-name" />
              </Form.Item>
              <Form.Item name="last_name" label="Last name" rules={[{ required: true, message: 'Enter your last name.' }]}>
                <Input prefix={<UserOutlined />} autoComplete="family-name" />
              </Form.Item>
              {needs('email') && <Form.Item name="email" label="Email (optional)" rules={[{ type: 'email', message: 'Enter a valid email address.' }]}><Input autoComplete="email" /></Form.Item>}
              {needs('phone') && <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Enter your phone number.' }]}><Input autoComplete="tel" /></Form.Item>}
              {needs('address') && <Form.Item name="address" label="Address" rules={[{ required: true, message: 'Enter your address.' }]}><Input autoComplete="street-address" /></Form.Item>}
              {needs('city') && <Form.Item name="city" label="City" rules={[{ required: true, message: 'Enter your city.' }]}><Input autoComplete="address-level2" /></Form.Item>}
              {needs('postal_code') && <Form.Item name="postal_code" label="Postal code" rules={[{ required: true, message: 'Enter your postal code.' }]}><Input autoComplete="postal-code" /></Form.Item>}
              {needs('business_name') && <Form.Item name="business_name" label="Salon or business name" rules={[{ required: true, message: 'Enter your salon or business name.' }]}><Input autoComplete="organization" /></Form.Item>}
              {needs('business_address') && <Form.Item name="business_address" label="Salon or business address" rules={[{ required: true, message: 'Enter your salon or business address.' }]}><Input /></Form.Item>}
              {needs('business_city') && <Form.Item name="business_city" label="Salon or business city" rules={[{ required: true, message: 'Enter your salon or business city.' }]}><Input /></Form.Item>}
              {needs('business_phone') && <Form.Item name="business_phone" label="Salon or business phone" rules={[{ required: true, message: 'Enter your salon or business phone.' }]}><Input autoComplete="tel" /></Form.Item>}
              <Form.Item name="password" label="Create a password" rules={[{ required: true, min: 8, message: 'Use at least 8 characters.' }]}>
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="password_confirmation" label="Confirm password" dependencies={['password']} rules={[{ required: true, message: 'Confirm your password.' }, ({ getFieldValue }) => ({ validator: (_, value) => !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Passwords do not match.')) })]}>
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>This link can be used once and will expire automatically.</Text>
              <Button type="primary" htmlType="submit" size="large" loading={submitting} block>Activate stylist account</Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}

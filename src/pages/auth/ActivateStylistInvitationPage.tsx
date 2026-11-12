import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Spin, Typography, message } from 'antd';
import { LockOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '@/features/auth/slice';
import type { User } from '@/types';
import AuthPageHeader from '@/components/AuthPageHeader';
import { resolveActivationField } from '@/shared/utils/activationFields';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        if (!response.ok) throw new Error(payload.message || t('pages.invite.unavailableText'));

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
        setError(loadError instanceof Error ? loadError.message : t('pages.invite.unavailableText'));
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
      if (!response.ok) throw new Error(result.message || t('pages.invite.failed'));

      dispatch(setCredentials({ token: result.data.token, user: result.data.user as User }));
      message.success(t('pages.invite.ready'));
      navigate('/stylist/workspace', { replace: true });
    } catch (submitError) {
      message.error(submitError instanceof Error ? submitError.message : t('pages.invite.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AuthPageHeader />
      <Card style={{ width: '100%', maxWidth: 560, borderRadius: 16 }} styles={{ body: { padding: 32 } }}>
        {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}
        {!loading && error && <Alert type="error" showIcon message={t('pages.invite.unavailable')} description={error} />}
        {!loading && invitation && (
          <>
            <Title level={2} style={{ marginBottom: 8 }}>{t('pages.invite.title')}</Title>
            <Paragraph type="secondary">Welcome, {invitation.display_name}. We have prefilled the details we already know. Add only the missing information below, then choose your password.</Paragraph>
            <Alert type="info" showIcon icon={<ShopOutlined />} message={t('pages.invite.proAccount')} description={t('pages.invite.proText')} style={{ marginBottom: 20 }} />
            <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item name="first_name" label={t('auth.firstName')} rules={[{ required: true, message: t('pages.invite.enterFirstName') }]}>
                <Input prefix={<UserOutlined />} autoComplete="given-name" />
              </Form.Item>
              <Form.Item name="last_name" label={t('auth.lastName')} rules={[{ required: true, message: t('pages.invite.enterLastName') }]}>
                <Input prefix={<UserOutlined />} autoComplete="family-name" />
              </Form.Item>
              {needs('email') && <Form.Item name="email" label={t('pages.invite.emailOptional')} rules={[{ type: 'email', message: t('pages.invite.validEmail') }]}><Input autoComplete="email" /></Form.Item>}
              {needs('phone') && <Form.Item name="phone" label={t('auth.phone')} rules={[{ required: true, message: t('pages.invite.enterPhone') }]}><Input autoComplete="tel" /></Form.Item>}
              {needs('address') && <Form.Item name="address" label={t('pages.invite.address')} rules={[{ required: true, message: t('pages.invite.enterAddress') }]}><Input autoComplete="street-address" /></Form.Item>}
              {needs('city') && <Form.Item name="city" label={t('pages.invite.city')} rules={[{ required: true, message: t('pages.invite.enterCity') }]}><Input autoComplete="address-level2" /></Form.Item>}
              {needs('postal_code') && <Form.Item name="postal_code" label={t('pages.invite.postcode')} rules={[{ required: true, message: t('pages.invite.enterPostcode') }]}><Input autoComplete="postal-code" /></Form.Item>}
              {needs('business_name') && <Form.Item name="business_name" label={t('pages.invite.salonName')} rules={[{ required: true, message: t('pages.invite.enterSalonName') }]}><Input autoComplete="organization" /></Form.Item>}
              {needs('business_address') && <Form.Item name="business_address" label={t('pages.invite.salonAddress')} rules={[{ required: true, message: t('pages.invite.enterSalonAddress') }]}><Input /></Form.Item>}
              {needs('business_city') && <Form.Item name="business_city" label={t('pages.invite.salonCity')} rules={[{ required: true, message: t('pages.invite.enterSalonCity') }]}><Input /></Form.Item>}
              {needs('business_phone') && <Form.Item name="business_phone" label={t('pages.invite.salonPhone')} rules={[{ required: true, message: t('pages.invite.enterSalonPhone') }]}><Input autoComplete="tel" /></Form.Item>}
              <Form.Item name="password" label={t('pages.invite.createPassword')} rules={[{ required: true, min: 8, message: t('auth.passwordMin') }]}>
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="password_confirmation" label={t('auth.confirmPassword')} dependencies={['password']} rules={[{ required: true, message: t('pages.invite.confirmPassword') }, ({ getFieldValue }) => ({ validator: (_, value) => !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error(t('auth.passwordsNoMatch'))) })]}>
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{t('pages.invite.oneTime')}</Text>
              <Button type="primary" htmlType="submit" size="large" loading={submitting} block>{t('pages.invite.activate')}</Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}

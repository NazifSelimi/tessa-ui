import { useEffect } from 'react';
import { Alert, Button, Card, Form, Input, Select, Typography, message } from 'antd';
import { HomeOutlined, MailOutlined, PhoneOutlined, PushpinOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { extractErrorMessage } from '@/shared/utils/error';
import { isProfileComplete } from '@/features/auth/profile';
import {
  MACEDONIA_CITY_OPTIONS,
  MACEDONIA_POSTCODE_OPTIONS,
  getCityForPostcode,
  getPostcodeForCity,
} from '@/shared/data/macedoniaLocations';

const { Paragraph, Title } = Typography;
const { TextArea } = Input;
const API_BASE_URL = import.meta.env.VITE_API_URL as string;

interface CompleteProfileValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  account_type: 'customer' | 'stylist';
  salon_name?: string;
  salon_address?: string;
  salon_city?: string;
  salon_phone?: string;
  message?: string;
}

function getContinuePath(search: string): string {
  const params = new URLSearchParams(search);
  const continueTo = params.get('continue') || '/';

  return continueTo.startsWith('/') ? continueTo : '/';
}

function getRequestedAccountType(search: string): 'customer' | 'stylist' {
  const params = new URLSearchParams(search);
  return params.get('account_type') === 'stylist' ? 'stylist' : 'customer';
}

export default function CompleteProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, updateProfile, isLoading } = useAuth();
  const [form] = Form.useForm<CompleteProfileValues>();
  const continueTo = getContinuePath(location.search);
  const requestedAccountType = getRequestedAccountType(location.search);
  const initialTarget = requestedAccountType === 'stylist' ? '/stylist/request' : continueTo;
  const selectedAccountType = Form.useWatch('account_type', form) ?? requestedAccountType;

  useEffect(() => {
    if (user && isProfileComplete(user)) {
      navigate(initialTarget, { replace: true });
    }
  }, [initialTarget, navigate, user]);

  const submitStylistRequest = async (values: CompleteProfileValues) => {
    const response = await fetch(`${API_BASE_URL}/v1/stylist-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        saloon_name: values.salon_name,
        saloon_address: values.salon_address,
        saloon_city: values.salon_city,
        saloon_phone: values.salon_phone,
        message: values.message || undefined,
      }),
    });

    if (response.ok) {
      return;
    }

    const payload = await response.json().catch(() => ({ message: '' }));
    throw new Error(payload.message || t('account.stylistRequestFailed'));
  };

  const handleSubmit = async (values: CompleteProfileValues) => {
    try {
      const target = values.account_type === 'stylist' ? '/stylist/request' : continueTo;
      const {
        account_type,
        salon_name,
        salon_address,
        salon_city,
        salon_phone,
        message: stylistMessage,
        ...profileValues
      } = values;
      await updateProfile(profileValues);
      if (account_type === 'stylist') {
        await submitStylistRequest({
          ...profileValues,
          account_type,
          salon_name,
          salon_address,
          salon_city,
          salon_phone,
          message: stylistMessage,
        });
      }
      message.success(t('account.profileCompleted'));
      navigate(target, { replace: true });
    } catch (error: unknown) {
      message.error(extractErrorMessage(error));
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
        style={{
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          borderRadius: 12,
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Title level={3} style={{ marginBottom: 8 }}>
          {t('account.completeProfileTitle')}
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          {t('account.completeProfileDescription')}
        </Paragraph>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            first_name: user?.firstName || '',
            last_name: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
            address: user?.address || '',
            city: user?.city || '',
            postcode: user?.postcode || '',
            account_type: requestedAccountType,
            salon_city: user?.city || '',
            salon_phone: user?.phone || '',
          }}
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item name="first_name" label={t('auth.firstName')} rules={[{ required: true, message: t('common.required') }]}>
            <Input prefix={<UserOutlined />} autoComplete="given-name" />
          </Form.Item>

          <Form.Item name="last_name" label={t('auth.lastName')} rules={[{ required: true, message: t('common.required') }]}>
            <Input prefix={<UserOutlined />} autoComplete="family-name" />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('auth.email')}
            rules={[
              { required: true, message: t('auth.enterEmail') },
              { type: 'email', message: t('auth.invalidEmail') },
            ]}
          >
            <Input prefix={<MailOutlined />} autoComplete="email" />
          </Form.Item>

          <Form.Item name="phone" label={t('auth.phone')} rules={[{ required: true, message: t('auth.enterPhone') }]}>
            <Input prefix={<PhoneOutlined />} autoComplete="tel" />
          </Form.Item>

          <Form.Item name="address" label={t('checkout.address')} rules={[{ required: true, message: t('account.enterAddress') }]}>
            <Input prefix={<HomeOutlined />} autoComplete="street-address" />
          </Form.Item>

          <Form.Item name="city" label={t('checkout.municipality')} rules={[{ required: true, message: t('account.enterMunicipality') }]}>
            <Select
              showSearch
              options={MACEDONIA_CITY_OPTIONS}
              placeholder={t('account.selectMunicipality')}
              optionFilterProp="label"
              suffixIcon={<PushpinOutlined />}
              onChange={(city) => {
                const postcode = getPostcodeForCity(city);
                if (postcode) {
                  form.setFieldValue('postcode', postcode);
                }
              }}
            />
          </Form.Item>

          <Form.Item name="postcode" label={t('checkout.zip')} rules={[{ required: true, message: t('account.enterPostcode') }]}>
            <Select
              showSearch
              options={MACEDONIA_POSTCODE_OPTIONS}
              placeholder={t('account.selectPostcode')}
              optionFilterProp="label"
              onChange={(postcode) => {
                const city = getCityForPostcode(postcode);
                if (city) {
                  form.setFieldValue('city', city);
                }
              }}
            />
          </Form.Item>

          <Form.Item name="account_type" label={t('auth.accountType')} rules={[{ required: true, message: t('auth.selectAccountType') }]}>
            <Select
              options={[
                { value: 'customer', label: t('auth.customer') },
                { value: 'stylist', label: t('auth.stylistProfessional') },
              ]}
            />
          </Form.Item>

          {selectedAccountType === 'stylist' && (
            <>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={t('account.stylistDetailsTitle')}
                description={t('account.stylistDetailsDescription')}
              />

              <Form.Item name="salon_name" label={t('account.salonName')} rules={[{ required: true, message: t('account.enterSalonName') }]}>
                <Input autoComplete="organization" />
              </Form.Item>

              <Form.Item name="salon_address" label={t('account.salonAddress')} rules={[{ required: true, message: t('account.enterSalonAddress') }]}>
                <Input autoComplete="street-address" />
              </Form.Item>

              <Form.Item name="salon_city" label={t('account.salonMunicipality')} rules={[{ required: true, message: t('account.enterSalonMunicipality') }]}>
                <Select
                  showSearch
                  options={MACEDONIA_CITY_OPTIONS}
                  placeholder={t('account.selectMunicipality')}
                  optionFilterProp="label"
                />
              </Form.Item>

              <Form.Item name="salon_phone" label={t('account.salonPhone')} rules={[{ required: true, message: t('account.enterSalonPhone') }]}>
                <Input autoComplete="tel" />
              </Form.Item>

              <Form.Item name="message" label={t('account.stylistMessageOptional')}>
                <TextArea rows={4} />
              </Form.Item>
            </>
          )}

          <Button type="primary" htmlType="submit" loading={isLoading} block>
            {t('account.saveAndContinue')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}

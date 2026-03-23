/**
 * Register Page Component
 * Handles new user registration with validation
 *
 * API Integration complete for registration.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Select,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PhoneOutlined,
  HomeOutlined,
  PushpinOutlined,
  GoogleOutlined,
  FacebookOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import { startSocialAuth, type SocialProvider } from '@/features/auth/social';
import {
  MACEDONIA_CITY_OPTIONS,
  MACEDONIA_POSTCODE_OPTIONS,
  getCityForPostcode,
  getPostcodeForCity,
} from '@/shared/data/macedoniaLocations';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  password: string;
  confirmPassword: string;
  accountType: 'customer' | 'stylist';
  agreeToTerms: boolean;
}

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values: RegisterFormValues) => {
    if (!values.agreeToTerms) {
      message.error(t('auth.pleaseAgreeTerms'));
      return;
    }

    setLoading(true);
    try {
      await register({
        email: values.email,
        password: values.password,
        first_name: values.firstName,
        last_name: values.lastName,
        phone: values.phone,
        address: values.address,
        city: values.city,
        postcode: values.postcode,
      });
      message.success(t('auth.accountCreated'));
      navigate(values.accountType === 'stylist' ? '/stylist/request' : '/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('auth.registrationFailed');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = (provider: SocialProvider) => {
    const accountType = form.getFieldValue('accountType') as RegisterFormValues['accountType'] | undefined;
    const target = accountType === 'stylist' ? '/stylist/request' : '/';

    startSocialAuth(provider, {
      intent: 'register',
      redirect: target,
      accountType,
    });
  };

  const handleFacebookComingSoon = () => {
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
          maxWidth: 480,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          borderRadius: 12,
        }}
        styles={{ body: { padding: 32 } }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ display: 'inline-block' }}>
            <Logo variant="dark" height={36} />
          </Link>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {t('auth.createYourAccount')}
          </Paragraph>
        </div>

        {/* Registration Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          initialValues={{ accountType: 'customer' }}
        >
          {/* Name Fields */}
          <Space style={{ width: '100%', display: 'flex' }} size={12}>
            <Form.Item
              name="firstName"
              label={t('auth.firstName')}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="John"
                size="large"
                autoComplete="given-name"
              />
            </Form.Item>

            <Form.Item
              name="lastName"
              label={t('auth.lastName')}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, marginBottom: 16 }}
            >
              <Input
                placeholder="Doe"
                size="large"
                autoComplete="family-name"
              />
            </Form.Item>
          </Space>

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
            name="phone"
            label={t('auth.phone')}
            rules={[{ required: true, message: t('auth.enterPhone') }]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="+1 (555) 000-0000"
              size="large"
              autoComplete="tel"
            />
          </Form.Item>

          <Form.Item
            name="address"
            label={t('checkout.address')}
            rules={[{ required: true, message: t('account.enterAddress') }]}
          >
            <Input
              prefix={<HomeOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Street and number"
              size="large"
              autoComplete="street-address"
            />
          </Form.Item>

          <Space style={{ width: '100%', display: 'flex' }} size={12}>
            <Form.Item
              name="city"
              label={t('checkout.municipality')}
              rules={[{ required: true, message: t('account.enterMunicipality') }]}
              style={{ flex: 1, marginBottom: 16 }}
            >
              <Select
                size="large"
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

            <Form.Item
              name="postcode"
              label={t('checkout.zip')}
              rules={[{ required: true, message: t('account.enterPostcode') }]}
              style={{ flex: 1, marginBottom: 16 }}
            >
              <Select
                size="large"
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
          </Space>

          <Form.Item
            name="accountType"
            label={t('auth.accountType')}
            rules={[{ required: true, message: t('auth.selectAccountType') }]}
          >
            <Select size="large">
              <Option value="customer">{t('auth.customer')}</Option>
              <Option value="stylist">{t('auth.stylistProfessional')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[
              { required: true, message: t('auth.enterPassword') },
              { min: 8, message: t('auth.passwordMin') },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: t('auth.passwordRequirements'),
              },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={t('auth.createPassword')}
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
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={t('auth.confirmYourPassword')}
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="agreeToTerms"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject(new Error(t('auth.mustAgreeTerms'))),
              },
            ]}
          >
            <Checkbox>
              {t('auth.agreeToTerms')}{' '}
              <Link to="/terms" target="_blank">{t('auth.termsOfService')}</Link>
              {' '}{t('auth.and')}{' '}
              <Link to="/privacy" target="_blank">{t('auth.privacyPolicy')}</Link>
            </Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              {t('auth.createAccount')}
            </Button>
          </Form.Item>
        </Form>

        {/* OAuth Divider */}
        <Divider plain>
          <Text type="secondary" style={{ fontSize: 12 }}>{t('auth.orSignUpWith')}</Text>
        </Divider>

        {/* OAuth Buttons */}
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Button
            size="large"
            block
            icon={<GoogleOutlined />}
            onClick={() => handleSocialRegister('google')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {t('auth.continueWithGoogle')}
          </Button>
          <Button
            size="large"
            block
            icon={<FacebookOutlined />}
            onClick={handleFacebookComingSoon}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {t('auth.continueWithFacebook')}
          </Button>
        </Space>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" style={{ fontWeight: 500 }}>
              {t('auth.signIn')}
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;

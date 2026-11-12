/**
 * Stylist Request Page
 *
 * Allows users to apply to become a stylist.
 * Shows application form, status tracking, and benefits.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Card, Form, Input, Button, Result, Steps, Alert, App, Spin, Select } from 'antd';
import { ScissorOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { store } from '@/store/index';
import type { StylistRequestStatus } from '@/types';
import { extractErrorMessage } from '@/shared/utils/error';
import { notifyError } from '@/shared/utils/notify';
import { MACEDONIA_CITY_OPTIONS, filterLocationOption } from '@/shared/data/macedoniaLocations';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Base API URL — must be configured via VITE_API_URL env variable
const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export default function StylistRequestPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { user, currentRole, isStylist } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [requestStatus, setRequestStatus] = useState<StylistRequestStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [allowResubmit, setAllowResubmit] = useState(false);

  // Check existing request status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = store.getState().auth.token;
        if (!token) {
          setCheckingStatus(false);
          return;
        }
        const response = await fetch(`${API_BASE_URL}/v1/stylist-requests/status`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data?.status) {
            setRequestStatus(result.data.status as StylistRequestStatus);
            setRejectionReason(result.data.rejectionReason ?? null);
          }
        }
      } catch {
        // Silently fail — user simply hasn't submitted yet
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, []);

  const handleSubmit = async (values: {
    name: string;
    email: string;
    salonName: string;
    salonAddress: string;
    salonCity: string;
    salonPhone: string;
    about?: string;
  }) => {
    setLoading(true);
    try {
      const token = store.getState().auth.token;
      const response = await fetch(`${API_BASE_URL}/v1/stylist-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          saloon_name: values.salonName,
          saloon_address: values.salonAddress,
          saloon_city: values.salonCity,
          saloon_phone: values.salonPhone,
          message: values.about || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: t('pages.stylistRequest.submitFailed') }));
        throw new Error(err.message || t('pages.stylistRequest.submitFailed'));
      }

      setRequestStatus('pending');
      setRejectionReason(null);
      setAllowResubmit(false);
      message.success(t('pages.stylistRequest.submitted'));
    } catch (error: unknown) {
      notifyError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Already a stylist
  if (isStylist || currentRole === 'stylist' || requestStatus === 'approved') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Result
            status="success"
            icon={<ScissorOutlined style={{ color: '#52c41a' }} />}
            title={t('pages.stylistRequest.approvedTitle')}
            subTitle={t('pages.stylistRequest.approvedText')}
            extra={
              <Link to="/shop">
                <Button type="primary">{t('pages.stylistRequest.shopNow')}</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  // Pending request
  if (requestStatus === 'pending') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Result
            icon={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            title={t('pages.stylistRequest.reviewTitle')}
            subTitle={t('pages.stylistRequest.reviewText')}
          />
          <Steps
            current={1}
            items={[
              { title: t('pages.stylistRequest.stepSubmitted'), status: 'finish' },
              { title: t('pages.stylistRequest.stepReview'), status: 'process' },
              { title: 'Approved', status: 'wait' },
            ]}
          />
        </Card>
      </div>
    );
  }

  if (requestStatus === 'rejected' && !allowResubmit) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Result
            status="error"
            title={t('pages.stylistRequest.rejectedTitle')}
            subTitle={t('pages.stylistRequest.rejectedText')}
            extra={
              <Button type="primary" onClick={() => setAllowResubmit(true)}>
                Submit a New Application
              </Button>
            }
          />
          {rejectionReason && (
            <Alert
              message={t('pages.stylistRequest.reason')}
              description={rejectionReason}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <ScissorOutlined style={{ fontSize: 48, color: '#1a1a1a', marginBottom: 16 }} />
        <Title level={2}>{t('pages.stylistRequest.title')}</Title>
        <Text type="secondary">
          Join our professional network and enjoy exclusive pricing, early access to new products, 
          and special promotions.
        </Text>
      </div>

      <Card>
        <Alert
          message={t('pages.stylistRequest.benefits')}
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>{t('pages.stylistRequest.benefitPrice')}</li>
              <li>{t('pages.stylistRequest.benefitPro')}</li>
              <li>{t('pages.stylistRequest.benefitEarly')}</li>
              <li>{t('pages.stylistRequest.benefitSupport')}</li>
            </ul>
          }
          type="info"
          style={{ marginBottom: 24 }}
        />

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label={t('pages.stylistRequest.fullName')}
            rules={[{ required: true, message: t('pages.stylistRequest.enterName') }]}
            initialValue={[user?.firstName, user?.lastName].filter(Boolean).join(' ')}
          >
            <Input placeholder={t('pages.stylistRequest.fullNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('auth.email')}
            rules={[
              { required: true, message: t('pages.stylistRequest.enterEmail') },
              { type: 'email', message: t('pages.stylistRequest.validEmail') },
            ]}
            initialValue={user?.email}
          >
            <Input placeholder="your@email.com" />
          </Form.Item>

          <Form.Item
            name="salonName"
            label={t('pages.stylistRequest.salonName')}
            rules={[{ required: true, message: t('pages.stylistRequest.enterSalonName') }]}
          >
            <Input placeholder={t('pages.stylistRequest.salonPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="salonAddress"
            label={t('pages.stylistRequest.salonAddress')}
            rules={[{ required: true, message: t('pages.stylistRequest.enterSalonAddress') }]}
          >
            <Input placeholder={t('pages.stylistRequest.salonAddressPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="salonCity"
            label={t('pages.stylistRequest.salonMunicipality')}
            rules={[{ required: true, message: t('pages.stylistRequest.selectMunicipality') }]}
          >
            <Select
              showSearch
              options={MACEDONIA_CITY_OPTIONS}
              placeholder={t('pages.stylistRequest.municipalityPlaceholder')}
              filterOption={filterLocationOption}
            />
          </Form.Item>

          <Form.Item
            name="salonPhone"
            label={t('pages.stylistRequest.salonPhone')}
            rules={[{ required: true, message: t('pages.stylistRequest.enterSalonPhone') }]}
          >
            <Input placeholder="+1 234 567 8900" />
          </Form.Item>

          <Form.Item name="about" label={t('pages.stylistRequest.about')}>
            <TextArea 
              rows={4} 
              placeholder={t('pages.stylistRequest.aboutPlaceholder')}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Submit Application
          </Button>
        </Form>

        <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center', fontSize: 12 }}>
          Applications are typically reviewed within 1-2 business days. 
          You'll receive an email notification once your application has been processed.
        </Paragraph>
      </Card>
    </div>
  );
}

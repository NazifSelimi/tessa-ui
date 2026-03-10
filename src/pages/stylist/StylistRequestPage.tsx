/**
 * Stylist Request Page
 * 
 * Allows users to apply to become a stylist.
 * Shows application form, status tracking, and benefits.
 */

import { useState } from 'react';
import { Typography, Card, Form, Input, Button, Result, Steps, Alert, message } from 'antd';
import { ScissorOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { store } from '@/store/index';
import type { StylistRequestStatus } from '@/types';
import { extractErrorMessage } from '@/shared/utils/error';
import { notifyError } from '@/shared/utils/notify';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Base API URL — must be configured via VITE_API_URL env variable
const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export default function StylistRequestPage() {
  const { user, currentRole, isStylist } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestStatus] = useState<StylistRequestStatus | null>(null);

  const handleSubmit = async (values: {
    name: string;
    email: string;
    salonName?: string;
    salonAddress?: string;
    salonCity?: string;
    salonPhone?: string;
    experience?: string;
    referralCode?: string;
    about?: string;
  }) => {
    setLoading(true);
    try {
      const token = store.getState().auth.token;
      const response = await fetch(`${API_BASE_URL}/v1/stylist-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
        const err = await response.json();
        throw new Error(err.message || 'Failed to submit application');
      }

      setSubmitted(true);
      message.success('Application submitted successfully!');
    } catch (error: unknown) {
      notifyError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Already a stylist
  if (isStylist || currentRole === 'stylist') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Result
            status="success"
            icon={<ScissorOutlined style={{ color: '#52c41a' }} />}
            title="You're a Verified Stylist!"
            subTitle="Enjoy exclusive stylist pricing on all products."
            extra={
              <Button type="primary" href="/">
                Shop with Stylist Pricing
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // Show status based on request state
  if (requestStatus === 'pending' || submitted) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Result
            icon={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            title="Application Under Review"
            subTitle="We're reviewing your stylist application. This usually takes 1-2 business days."
          />
          <Steps
            current={1}
            items={[
              { title: 'Submitted', status: 'finish' },
              { title: 'Under Review', status: 'process' },
              { title: 'Approved', status: 'wait' },
            ]}
          />
        </Card>
      </div>
    );
  }

  if (requestStatus === 'rejected') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="Application Not Approved"
            subTitle="Unfortunately, your stylist application was not approved at this time."
            extra={
              <Button type="primary" onClick={() => window.location.reload()}>
                Apply Again
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <ScissorOutlined style={{ fontSize: 48, color: '#1a1a1a', marginBottom: 16 }} />
        <Title level={2}>Become a Tessa Stylist</Title>
        <Text type="secondary">
          Join our professional network and enjoy exclusive pricing, early access to new products, 
          and special promotions.
        </Text>
      </div>

      <Card>
        <Alert
          message="Stylist Benefits"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>Up to 25% off retail prices</li>
              <li>Access to professional-only products</li>
              <li>Early access to new releases</li>
              <li>Priority customer support</li>
            </ul>
          }
          type="info"
          style={{ marginBottom: 24 }}
        />

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter your name' }]}
            initialValue={user?.name}
          >
            <Input placeholder="Your full name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
            initialValue={user?.email}
          >
            <Input placeholder="your@email.com" />
          </Form.Item>

          <Form.Item name="salonName" label="Salon/Business Name" rules={[{ required: true, message: 'Please enter your salon name' }]}>
            <Input placeholder="Where do you work?" />
          </Form.Item>

          <Form.Item name="salonAddress" label="Salon Address" rules={[{ required: true, message: 'Please enter the salon address' }]}>
            <Input placeholder="Business address" />
          </Form.Item>

          <Form.Item name="salonCity" label="Salon City" rules={[{ required: true, message: 'Please enter the salon city' }]}>
            <Input placeholder="City" />
          </Form.Item>

          <Form.Item name="salonPhone" label="Salon Phone" rules={[{ required: true, message: 'Please enter the salon phone number' }]}>
            <Input placeholder="+1 234 567 8900" />
          </Form.Item>

          <Form.Item name="experience" label="Years of Experience">
            <Input placeholder="e.g., 5 years" />
          </Form.Item>

          <Form.Item
            name="referralCode"
            label="Distributor Referral Code (Optional)"
            extra="If a distributor referred you, enter their code here"
          >
            <Input placeholder="e.g., DIST2024" />
          </Form.Item>

          <Form.Item name="about" label="Tell Us About Yourself">
            <TextArea 
              rows={4} 
              placeholder="Share your experience, specialties, or why you want to join..."
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

import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Popconfirm, Row, Space, Table, Tag, Typography, message } from 'antd';
import { CopyOutlined, QrcodeOutlined, ScissorOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;
const { Title, Paragraph, Text } = Typography;

interface InviteFormValues {
  source_reference?: string;
  display_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  business_name?: string;
  business_address?: string;
  business_city?: string;
  business_phone?: string;
}

interface CreatedInvitation {
  id: string;
  activation_url: string;
  expires_at: string;
}

interface InvitationRow {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  business_name: string | null;
  business_city: string | null;
  status: 'pending' | 'activated' | 'expired' | 'revoked';
  expires_at: string;
}

interface InvitationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export default function AdminStylistInvitationsPage() {
  const { token } = useAuth();
  const [form] = Form.useForm<InviteFormValues>();
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [invitationMeta, setInvitationMeta] = useState<InvitationMeta>({ current_page: 1, per_page: 25, total: 0, last_page: 1 });

  const loadInvitations = async (page = invitationMeta.current_page) => {
    setLoadingInvitations(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/stylist-invitations?page=${page}&per_page=25`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Could not load invitations.');
      setInvitations(payload.data ?? []);
      setInvitationMeta(payload.meta);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not load invitations.');
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    void loadInvitations();
  }, [token]);

  const createInvitation = async (values: InviteFormValues) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/stylist-invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Could not create the invitation.');

      setCreated(payload.data as CreatedInvitation);
      void loadInvitations();
      message.success('One-time activation link created.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not create the invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyActivationUrl = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.activation_url);
    message.success('Activation link copied.');
  };

  const reissueInvitation = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/stylist-invitations/${id}/reissue`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Could not regenerate the activation link.');
      setCreated(payload.data as CreatedInvitation);
      void loadInvitations();
      message.success('New activation QR created.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not regenerate the activation link.');
    }
  };

  const revokeInvitation = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/stylist-invitations/${id}/revoke`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Could not revoke the invitation.');
      void loadInvitations();
      message.success('Invitation revoked.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not revoke the invitation.');
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <Title level={2}><ScissorOutlined /> Stylist invitations</Title>
      <Paragraph type="secondary">Create a one-time account setup link. Enter only the contact and business details you have; the stylist will be asked for the rest during activation.</Paragraph>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="Invitation details">
            <Form form={form} layout="vertical" onFinish={createInvitation} requiredMark={false}>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="display_name" label="Display name" rules={[{ required: true, message: 'Enter the stylist or salon name.' }]}><Input placeholder="Example: Studio Elena" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="source_reference" label="Source reference"><Input placeholder="Optional legacy client code" /></Form.Item></Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="address" label="Address"><Input /></Form.Item>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="city" label="City"><Input placeholder="Skopje" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="postal_code" label="Postal code"><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="business_name" label="Salon or business name"><Input /></Form.Item>
              <Form.Item name="business_address" label="Salon or business address"><Input /></Form.Item>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="business_city" label="Salon or business city"><Input placeholder="Skopje" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="business_phone" label="Salon or business phone"><Input /></Form.Item></Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={submitting}>Create activation QR</Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={<Space><QrcodeOutlined /> Activation QR</Space>}>
            {!created && <Text type="secondary">Create an invitation to generate its QR code here.</Text>}
            {created && (
              <Space direction="vertical" size="middle" style={{ width: '100%', alignItems: 'center' }}>
                <QRCodeSVG value={created.activation_url} size={230} level="M" includeMargin />
                <Text type="secondary" style={{ textAlign: 'center' }}>Expires {new Date(created.expires_at).toLocaleDateString('en-GB')} and can be used once.</Text>
                <Button icon={<CopyOutlined />} onClick={copyActivationUrl}>Copy activation link</Button>
              </Space>
            )}
          </Card>
        </Col>
      </Row>
      <Card title={`Imported invitations (${invitationMeta.total})`} style={{ marginTop: 24 }} extra={<Button onClick={() => void loadInvitations()}>Refresh</Button>}>
        <Table
          loading={loadingInvitations}
          dataSource={invitations}
          rowKey="id"
          pagination={{
            current: invitationMeta.current_page,
            pageSize: invitationMeta.per_page,
            total: invitationMeta.total,
            showSizeChanger: false,
            onChange: (page) => void loadInvitations(page),
          }}
          scroll={{ x: 850 }}
          columns={[
            { title: 'Name', dataIndex: 'display_name', key: 'display_name', width: 190 },
            { title: 'Contact', key: 'contact', width: 220, render: (_: unknown, record: InvitationRow) => <>{record.email || 'No email'}<br />{record.phone || 'No phone'}</> },
            { title: 'City', key: 'city', width: 150, render: (_: unknown, record: InvitationRow) => record.business_city || record.city || 'Not provided' },
            { title: 'Salon', dataIndex: 'business_name', key: 'business_name', width: 190, render: (value: string | null) => value || 'Not provided' },
            { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (status: InvitationRow['status']) => <Tag color={status === 'activated' ? 'green' : status === 'pending' ? 'blue' : 'red'}>{status}</Tag> },
            { title: 'Expires', dataIndex: 'expires_at', key: 'expires_at', width: 130, render: (value: string) => new Date(value).toLocaleDateString('en-GB') },
            { title: 'Actions', key: 'actions', width: 180, render: (_: unknown, record: InvitationRow) => record.status === 'activated' ? 'Account active' : <Space size="small"><Button size="small" onClick={() => void reissueInvitation(record.id)}>New QR</Button><Popconfirm title="Revoke this activation link?" onConfirm={() => void revokeInvitation(record.id)} okText="Revoke" okButtonProps={{ danger: true }}><Button size="small" danger>Revoke</Button></Popconfirm></Space> },
          ]}
        />
      </Card>
    </div>
  );
}

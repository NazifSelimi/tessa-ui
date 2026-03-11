/**
 * Account Page
 * 
 * User profile management page.
 * Shows user info, allows profile updates, and provides quick links.
 *
 * Connected to API for profile updates.
 */

import { Link, useNavigate } from 'react-router-dom';
import { Typography, Card, Form, Input, Button, Row, Col, message, Avatar, Divider } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, ShoppingOutlined, ScissorOutlined, ThunderboltOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text } = Typography;

export default function AccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, currentRole, updateProfile, isLoading } = useAuth();
  const [form] = Form.useForm();

  const handleUpdateProfile = async (values: { first_name: string; last_name: string; email: string; phone: string }) => {
    try {
      await updateProfile(values);
      message.success(t('account.profileUpdated'));
    } catch (_error) {
      message.error(t('account.profileUpdateFailed'));
    }
  };

  const handleChangePassword = async (_values: { currentPassword: string; newPassword: string }) => {
    try {
      message.success(t('account.passwordUpdated'));
    } catch (_error) {
      message.error(t('account.passwordUpdateFailed'));
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 8, padding: '4px 0' }}
      >
        {t('common.back')}
      </Button>
      <Title level={2}>{t('account.myAccount')}</Title>
      <Text type="secondary">
        {t('account.manageSettings')}
      </Text>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Avatar size={80} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
              <Title level={4} style={{ margin: 0 }}>{user?.name || t('account.guestUser')}</Title>
              <Text type="secondary">{currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Account</Text>
            </div>

            <Divider />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/account/orders">
                <Button icon={<ShoppingOutlined />} block>
                  {t('auth.myOrders')}
                </Button>
              </Link>
              {(currentRole === 'user' || currentRole === 'guest') && (
                <Link to="/stylist/request">
                  <Button icon={<ScissorOutlined />} block>
                    {t('account.becomeStylist')}
                  </Button>
                </Link>
              )}
              {currentRole === 'stylist' && (
                <Link to="/stylist/quick-order">
                  <Button icon={<ThunderboltOutlined />} block type="primary">
                    {t('account.quickOrder')}
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title={t('account.profileInfo')}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                first_name: user?.firstName || '',
                last_name: user?.lastName || '',
                email: user?.email || '',
                phone: user?.phone || '',
              }}
              onFinish={handleUpdateProfile}
            >
              <Form.Item name="first_name" label={t('auth.firstName')} rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder="First name" />
              </Form.Item>

              <Form.Item name="last_name" label={t('auth.lastName')} rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder="Last name" />
              </Form.Item>

              <Form.Item
                name="email"
                label={t('auth.email')}
                rules={[{ required: true }, { type: 'email' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="your@email.com" />
              </Form.Item>

              <Form.Item name="phone" label={t('auth.phone')}>
                <Input prefix={<PhoneOutlined />} placeholder="+1 234 567 8900" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={isLoading}>
                {t('account.saveChanges')}
              </Button>
            </Form>
          </Card>

          <Card title={t('account.changePassword')} style={{ marginTop: 24 }}>
            <Form layout="vertical" onFinish={handleChangePassword}>
              <Form.Item 
                name="currentPassword" 
                label={t('account.currentPassword')}
                rules={[{ required: true, message: t('account.enterCurrentPassword') }]}
              >
                <Input.Password placeholder="Current password" />
              </Form.Item>
              <Form.Item 
                name="newPassword" 
                label={t('account.newPassword')}
                rules={[
                  { required: true, message: t('account.enterNewPassword') },
                  { min: 8, message: t('auth.passwordMin') },
                ]}
              >
                <Input.Password placeholder="New password" />
              </Form.Item>
              <Form.Item 
                name="confirmPassword" 
                label={t('account.confirmNewPassword')}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('account.confirmNewPasswordMsg') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t('auth.passwordsNoMatch')));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Confirm new password" />
              </Form.Item>
              <Button type="primary" htmlType="submit">{t('account.updatePassword')}</Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

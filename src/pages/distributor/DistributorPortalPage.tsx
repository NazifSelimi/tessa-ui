/**
 * Distributor Portal Page
 * 
 * Dashboard for distributors to manage their stylist network.
 * Shows stats, quick actions, and recent activity.
 */

import { Link } from 'react-router-dom';
import { Typography, Card, Row, Col, Statistic, Button, Space } from 'antd';
import { TeamOutlined, TagOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text } = Typography;

export default function DistributorPortalPage() {
  const { currentRole } = useAuth();

  if (currentRole !== 'distributor' && currentRole !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Title level={4}>Access Denied</Title>
        <Text type="secondary">This page is only available for distributors.</Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>Distributor Portal</Title>
        <Text type="secondary">
          Manage your stylist network, generate referral codes, and view products with wholesale pricing.
        </Text>
      </div>

      {/* Statistics Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Active Stylists"
              value="—"
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Codes Generated"
              value="—"
              prefix={<TagOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="This Month's Sales"
              value="—"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Growth"
              value="—"
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Action Cards */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card
            title="Generate Stylist Codes"
            extra={<Link to="/distributor/codes"><Button type="link">View All</Button></Link>}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Create unique referral codes to invite new stylists to join the Tessa network.
              When stylists sign up with your code, they'll be linked to your account.
            </Text>
            <Space>
              <Link to="/distributor/codes">
                <Button type="primary" icon={<TagOutlined />}>
                  Manage Codes
                </Button>
              </Link>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="Product Catalog"
            extra={<Link to="/distributor/products"><Button type="link">View All</Button></Link>}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Browse the complete product catalog with both retail and stylist pricing.
              Perfect for quoting prices to your stylist network.
            </Text>
            <Space>
              <Link to="/distributor/products">
                <Button type="primary" icon={<ShoppingOutlined />}>
                  View Products
                </Button>
              </Link>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Card title="Recent Activity" style={{ marginTop: 24 }}>
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <Text type="secondary">No recent activity</Text>
        </div>
      </Card>
    </div>
  );
}

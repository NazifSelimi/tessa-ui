/**
 * Distributor Codes Page
 * 
 * Allows distributors to manage their stylist referral codes.
 * 
 * TODO: Connect to API for real code management
 */

import { useNavigate } from 'react-router-dom';
import { 
  Typography, Card, Table, Button, Tag, Space, message, Spin 
} from 'antd';
import { PlusOutlined, CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useGetDistributorCodesQuery, useGenerateDistributorCodeMutation } from '@/features/stylist/api';

const { Title, Text } = Typography;

export default function DistributorCodesPage() {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const { data: codes = [], isLoading: loading } = useGetDistributorCodesQuery();
  const [generateCode, { isLoading: generating }] = useGenerateDistributorCodeMutation();

  const handleGenerateCode = async () => {
    try {
      const newCode = await generateCode({}).unwrap();
      message.success(`New code generated: ${newCode.code}`);
    } catch (_error) {
      message.error('Failed to generate code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success('Code copied to clipboard!');
  };

  if (currentRole !== 'distributor' && currentRole !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Title level={4}>Access Denied</Title>
        <Text type="secondary">This page is only available for distributors.</Text>
      </div>
    );
  }

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Space>
          <Text strong copyable={{ text: code }}>{code}</Text>
          <Button 
            type="text" 
            size="small" 
            icon={<CopyOutlined />}
            onClick={() => copyCode(code)}
          />
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: any) => (
        record.usedBy ? (
          <Tag color="default">Used</Tag>
        ) : record.isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        )
      ),
    },
    {
      title: 'Used By',
      dataIndex: 'usedBy',
      key: 'usedBy',
      render: (usedBy: string | undefined) => usedBy || '-',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Used At',
      dataIndex: 'usedAt',
      key: 'usedAt',
      render: (date: string | undefined) => date ? new Date(date).toLocaleDateString() : '-',
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/distributor')}
        style={{ marginBottom: 16 }}
      >
        Back to Portal
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Stylist Codes</Title>
          <Text type="secondary">Generate and manage referral codes for stylists</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleGenerateCode}
          loading={generating}
        >
          Generate New Code
        </Button>
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={codes}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
}

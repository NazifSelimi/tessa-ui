import { useMemo } from 'react';
import { Typography, Table, Tag, Card, Statistic, Row, Col } from 'antd';

const { Title, Text } = Typography;

export default function AdminDistributorsPage() {
  // TODO: Replace with real API call when backend is ready
  // const { data: distributors } = useGetDistributorsQuery();
  
  const distributors: any[] = []; // Stub data - backend not yet implemented
  const stylistCodes: any[] = []; // Stub data - backend not yet implemented
  
  // Calculate stats for each distributor — memoized to avoid O(n×m) on every render
  const { distributorStats, totalDistributors, totalCodes, totalStylists } = useMemo(() => {
    // Build a lookup map for O(1) access instead of O(m) filter per distributor
    const codesByDistributor = new Map<string, typeof stylistCodes>();
    for (const c of stylistCodes) {
      const key = c.distributorId;
      if (!codesByDistributor.has(key)) codesByDistributor.set(key, []);
      codesByDistributor.get(key)!.push(c);
    }

    const stats = distributors.map(dist => {
      const codes = codesByDistributor.get(dist.id) ?? [];
      const activeCodeCount = codes.filter(c => c.isActive && !c.usedBy).length;
      const usedCodeCount = codes.filter(c => c.usedBy).length;
      return {
        ...dist,
        totalCodes: codes.length,
        activeCodes: activeCodeCount,
        usedCodes: usedCodeCount,
        stylists: usedCodeCount,
      };
    });

    return {
      distributorStats: stats,
      totalDistributors: distributors.length,
      totalCodes: stylistCodes.length,
      totalStylists: stylistCodes.filter(c => c.usedBy).length,
    };
  }, [distributors, stylistCodes]);

  const columns = [
    {
      title: 'Distributor',
      key: 'distributor',
      render: (_: unknown, record: typeof distributorStats[0]) => (
        <div>
          <Text strong>{record.name}</Text>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: 'Total Codes',
      dataIndex: 'totalCodes',
      key: 'totalCodes',
    },
    {
      title: 'Active Codes',
      dataIndex: 'activeCodes',
      key: 'activeCodes',
      render: (count: number) => (
        <Tag color={count > 0 ? 'green' : 'default'}>{count}</Tag>
      ),
    },
    {
      title: 'Stylists Referred',
      dataIndex: 'stylists',
      key: 'stylists',
      render: (count: number) => <Text strong>{count}</Text>,
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <Title level={2}>Distributors</Title>
      <Text type="secondary">Manage distributor accounts and track their referral performance</Text>

      <Row gutter={[16, 16]} style={{ margin: '24px 0' }}>
        <Col xs={8}>
          <Card>
            <Statistic title="Total Distributors" value={totalDistributors} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="Total Codes Generated" value={totalCodes} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="Total Referrals" value={totalStylists} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          dataSource={distributorStats}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

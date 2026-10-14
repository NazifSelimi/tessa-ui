import { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Row, Space, Tag, Typography, message } from 'antd';
import { CheckOutlined, PictureOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

type Candidate = {
  product_id: number;
  candidate_rank: number;
  current_name: string;
  brand: string;
  source_image_url: string;
  current_image_url?: string | null;
  preview_url?: string | null;
  category?: string;
  replacement_status?: string;
  exact_package_match?: string;
  exact_shade_match?: string;
  match_confidence: string;
  background_type: string;
  width: number | null;
  height: number | null;
  downloaded_path: string | null;
};

type ImageHealthStatus = 'missing' | 'needs_review' | 'legacy' | 'approved';

type ImageHealthProduct = {
  id: string;
  name: string;
  brand?: string | null;
  status: ImageHealthStatus;
  imageUrl?: string | null;
  imageCount: number;
};

type ImageHealth = {
  summary: Record<ImageHealthStatus | 'total' | 'with_image', number>;
  products: ImageHealthProduct[];
};

const healthLabels: Record<ImageHealthStatus, string> = {
  missing: 'Missing image',
  needs_review: 'Needs review',
  legacy: 'Legacy image',
  approved: 'Approved image',
};

const healthColors: Record<ImageHealthStatus, string> = {
  missing: 'red',
  needs_review: 'gold',
  legacy: 'blue',
  approved: 'green',
};

export default function AdminCatalogImagesPage() {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [health, setHealth] = useState<ImageHealth | null>(null);
  const [healthStatus, setHealthStatus] = useState<ImageHealthStatus>('needs_review');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const headers = { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const [healthResponse, candidateResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/v1/admin/catalog-image-health?status=${healthStatus}&limit=24`, { headers }),
        fetch(`${API_BASE_URL}/v1/admin/catalog-image-candidates`, { headers }),
      ]);
      const healthPayload = await healthResponse.json();
      if (!healthResponse.ok) throw new Error(healthPayload.message || 'Could not load image health.');
      setHealth(healthPayload);
      const payload = await candidateResponse.json();
      if (!candidateResponse.ok) throw new Error(payload.message || 'Could not load image candidates.');
      setCandidates(payload.candidates ?? []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not load image candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token, healthStatus]);

  const approve = async (candidate: Candidate) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/catalog-image-candidates/${candidate.product_id}/approve`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ rank: candidate.candidate_rank }),
    });
    if (!response.ok) return message.error('Could not save the approval.');
    message.success(`${candidate.current_name} approved for the next controlled replacement.`);
  };

  return <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <div><Typography.Title level={2}>Image Review</Typography.Title><Typography.Text type="secondary">Staging candidates only. Legacy product images are preserved.</Typography.Text></div>
    {health && <>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}><Card size="small"><Typography.Text type="secondary">Products</Typography.Text><Typography.Title level={3} style={{ margin: 0 }}>{health.summary.total}</Typography.Title><Typography.Text type="secondary">{health.summary.with_image} have an image</Typography.Text></Card></Col>
        {(['missing', 'needs_review', 'legacy', 'approved'] as ImageHealthStatus[]).map((status) => <Col xs={12} sm={6} key={status}><Card size="small" hoverable onClick={() => setHealthStatus(status)} style={{ borderColor: healthStatus === status ? 'var(--ant-color-primary)' : undefined }}><Typography.Text type="secondary">{healthLabels[status]}</Typography.Text><Typography.Title level={3} style={{ margin: 0 }}>{health.summary[status]}</Typography.Title><Tag color={healthColors[status]}>{healthStatus === status ? 'Showing queue' : 'View queue'}</Tag></Card></Col>)}
      </Row>
      <Card size="small" title={healthLabels[healthStatus]} extra={<Button size="small" onClick={() => void load()}>Refresh</Button>}>
        {health.products.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing in this queue." /> : <Row gutter={[12, 12]}>{health.products.map((product) => <Col xs={24} sm={12} lg={8} key={product.id}><Card size="small" cover={<img src={product.imageUrl ?? '/placeholder.svg'} alt="" style={{ height: 150, objectFit: 'contain', background: '#fafafa' }} />}><Typography.Text strong>{product.name}</Typography.Text><br /><Typography.Text type="secondary">{product.brand ?? 'No brand'} · {product.imageCount} image{product.imageCount === 1 ? '' : 's'}</Typography.Text><br /><Tag color={healthColors[product.status]}>{healthLabels[product.status]}</Tag></Card></Col>)}</Row>}
      </Card>
    </>}
    {candidates.length === 0 && !loading ? <Empty description="No downloaded candidates available." /> : <Row gutter={[16, 16]}>
      {candidates.map((candidate) => <Col xs={24} sm={12} lg={8} key={`${candidate.product_id}-${candidate.candidate_rank}`}>
        <Card loading={loading}>
          <Row gutter={8}>
            <Col span={12}><Typography.Text type="secondary">Current</Typography.Text><img src={candidate.current_image_url ?? '/placeholder.svg'} alt={`Current ${candidate.current_name}`} style={{ width: '100%', height: 180, objectFit: 'contain', background: '#fafafa' }} /></Col>
            <Col span={12}><Typography.Text type="secondary">Candidate</Typography.Text><a href={candidate.source_image_url} target="_blank" rel="noreferrer" title="Open original source image"><img src={candidate.preview_url ?? candidate.source_image_url} alt={`Candidate ${candidate.current_name}`} style={{ width: '100%', height: 180, objectFit: 'contain', background: '#fafafa', cursor: 'pointer' }} /></a></Col>
          </Row>
          <Typography.Text strong>{candidate.current_name}</Typography.Text><br />
          <Typography.Text type="secondary">{candidate.brand} · {candidate.category} · {candidate.width ?? '?'}×{candidate.height ?? '?'}</Typography.Text><br />
          <Space style={{ marginTop: 10 }} wrap><Tag color="blue">{candidate.replacement_status ?? candidate.match_confidence}</Tag><Tag>package: {candidate.exact_package_match ?? 'unverified'}</Tag><Tag>shade: {candidate.exact_shade_match ?? 'n/a'}</Tag><Button icon={<CheckOutlined />} onClick={() => void approve(candidate)}>Approve</Button></Space>
        </Card>
      </Col>)}
    </Row>}
  </Space>;
}

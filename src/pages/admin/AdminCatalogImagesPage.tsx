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

export default function AdminCatalogImagesPage() {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/admin/catalog-image-candidates`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Could not load image candidates.');
      setCandidates(payload.candidates ?? []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not load image candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

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
    {candidates.length === 0 && !loading ? <Empty description="No downloaded candidates available." /> : <Row gutter={[16, 16]}>
      {candidates.map((candidate) => <Col xs={24} sm={12} lg={8} key={`${candidate.product_id}-${candidate.candidate_rank}`}>
        <Card loading={loading}>
          <Row gutter={8}>
            <Col span={12}><Typography.Text type="secondary">Current</Typography.Text><img src={candidate.current_image_url ?? '/placeholder.svg'} alt={`Current ${candidate.current_name}`} style={{ width: '100%', height: 180, objectFit: 'contain', background: '#fafafa' }} /></Col>
            <Col span={12}><Typography.Text type="secondary">Candidate</Typography.Text><img src={candidate.preview_url ?? candidate.source_image_url} alt={`Candidate ${candidate.current_name}`} style={{ width: '100%', height: 180, objectFit: 'contain', background: '#fafafa' }} /></Col>
          </Row>
          <Typography.Text strong>{candidate.current_name}</Typography.Text><br />
          <Typography.Text type="secondary">{candidate.brand} · {candidate.category} · {candidate.width ?? '?'}×{candidate.height ?? '?'}</Typography.Text><br />
          <Space style={{ marginTop: 10 }} wrap><Tag color="blue">{candidate.replacement_status ?? candidate.match_confidence}</Tag><Tag>package: {candidate.exact_package_match ?? 'unverified'}</Tag><Tag>shade: {candidate.exact_shade_match ?? 'n/a'}</Tag><Button icon={<CheckOutlined />} onClick={() => void approve(candidate)}>Approve</Button></Space>
        </Card>
      </Col>)}
    </Row>}
  </Space>;
}

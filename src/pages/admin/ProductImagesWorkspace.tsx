import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Drawer, Empty, Image, Input, InputNumber, Modal, Pagination, Popconfirm, Select, Slider, Space, Spin, Switch, Table, Tabs, Tag, Typography, Upload, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
const API = import.meta.env.VITE_API_URL as string;
type Product = { id: string; name: string; brand?: string; status: string; imageUrl?: string; imageCount: number };
type Asset = { id: number; url: string; alt: string; sort_order: number; variant: string; review_status: string; is_primary: boolean };
type Gallery = { product: { id: number; name: string }; images: Asset[] };
type Candidate = { product_id: number; candidate_rank: number; current_name: string; brand: string; current_image_url: string; preview_url: string; source_image_url: string; admin_review?: { status: string; note?: string } };
const labels: Record<string, string> = { all: 'All products', missing: 'Missing images', needs_review: 'Needs review', legacy: 'Legacy images', approved: 'Approved' };

export default function ProductImagesWorkspace() {
  const { token } = useAuth(); const [params, setParams] = useSearchParams(); const productId = params.get('product');
  const [health, setHealth] = useState<{ summary: Record<string, number>; products: Product[]; meta: { total: number } }>();
  const [status, setStatus] = useState('needs_review'); const [search, setSearch] = useState(''); const query = useDebounce(search, 300);
  const [sort, setSort] = useState('name_asc'); const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false);
  const [gallery, setGallery] = useState<Gallery>(); const [galleryLoading, setGalleryLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]); const [audit, setAudit] = useState(''); const [candidateSearch, setCandidateSearch] = useState('');
  const [decision, setDecision] = useState<{ candidate: Candidate; status: string }>(); const [note, setNote] = useState('');
  const [editAsset, setEditAsset] = useState<Asset>(); const [editSource, setEditSource] = useState<string>();
  const [rotation, setRotation] = useState(0); const [zoom, setZoom] = useState(1); const [square, setSquare] = useState(false); const [editorError, setEditorError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${API}/v1/admin/${path}`, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...init.headers } });
    if (response.status === 413) throw new Error('The server rejected this file size. Please use a smaller image.');
    const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Request failed. Please retry.'); return body;
  }
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    const p = new URLSearchParams({ limit: '24', page: String(page), search: query, sort }); if (status !== 'all') p.set('status', status);
    request(`catalog-image-health?${p}`, { signal: controller.signal }).then(setHealth).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, status, query, sort, page, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    request('catalog-image-candidates', { signal: controller.signal }).then(p => { setCandidates(p.candidates || []); setAudit(p.audit); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort();
  }, [token, refresh]);
  useEffect(() => {
    setGallery(undefined); if (!productId) return; const controller = new AbortController(); setGalleryLoading(true);
    request(`products/${productId}/images`, { signal: controller.signal }).then(setGallery).catch(e => { if (!controller.signal.aborted) message.error(e.message); }).finally(() => { if (!controller.signal.aborted) setGalleryLoading(false); }); return () => controller.abort();
  }, [productId, token]);
  async function mutate(path: string, body: object | FormData, method = 'POST') {
    setBusy(true);
    try { const result = await request(path, { method, body: body instanceof FormData ? body : JSON.stringify(body), headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' } }); if (result.images) setGallery(result); setRefresh(x => x + 1); message.success(result.message || 'Saved.'); return true; }
    catch (e) { message.error((e as Error).message); return false; } finally { setBusy(false); }
  }
  async function upload(file: File) {
    if (!productId) return false;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { message.error('Choose a JPG, PNG or WebP up to 10 MB.'); return false; }
    const data = new FormData(); data.append('image', file); data.append('alt', gallery?.product.name || ''); return mutate(`products/${productId}/images`, data);
  }
  const updateAsset = (asset: Asset, body: object) => mutate(`products/${productId}/images/${asset.id}`, body, 'PATCH');
  function openEditor(source: string) { setEditSource(source); setRotation(0); setZoom(1); setSquare(false); setEditorError('Loading image…'); }
  useEffect(() => {
    if (!editSource) return; let active = true; const img = new window.Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active || !canvas.current) return;
      const turned = rotation % 180 !== 0; const width = turned ? img.naturalHeight : img.naturalWidth; const height = turned ? img.naturalWidth : img.naturalHeight;
      const scale = Math.min(1, 2000 / Math.max(width, height)); const w = Math.round((square ? Math.min(width, height) : width) * scale); const h = Math.round((square ? Math.min(width, height) : height) * scale);
      const target = canvas.current; target.width = w; target.height = h; const context = target.getContext('2d')!;
      context.translate(w / 2, h / 2); context.rotate(rotation * Math.PI / 180); context.scale(scale * zoom, scale * zoom); context.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      try { target.toDataURL(); setEditorError(''); } catch { setEditorError('This external image blocks editing. Download it and upload a local copy.'); }
    };
    img.onerror = () => active && setEditorError('Unable to edit this image. Download it and upload a local copy.'); img.src = editSource; return () => { active = false; };
  }, [editSource, rotation, zoom, square]);
  const visibleCandidates = candidates.filter(c => `${c.current_name} ${c.brand} ${c.product_id}`.toLowerCase().includes(candidateSearch.toLowerCase()));
  return <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <div><Typography.Title level={2}>Product images</Typography.Title><Typography.Paragraph type="secondary">Click images to zoom. Manage galleries, upload photos and save edited copies. Existing files are preserved.</Typography.Paragraph></div>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRefresh(x => x + 1)}>Retry</Button>} />}
    <Tabs items={[{ key: 'products', label: 'Product image library', children: <>
      <Space wrap style={{ marginBottom: 16 }}>{Object.entries(labels).map(([key, label]) => <Button key={key} type={status === key ? 'primary' : 'default'} onClick={() => { setStatus(key); setPage(1); }}>{label} {health ? `(${health.summary[key === 'all' ? 'total' : key] ?? 0})` : ''}</Button>)}</Space>
      <Space wrap style={{ marginBottom: 16, display: 'flex' }}><Input aria-label="Search product images" placeholder="Find product, brand or ID" value={search} allowClear onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 300 }} /><Select aria-label="Sort product images" value={sort} style={{ width: 210 }} onChange={v => { setSort(v); setPage(1); }} options={[{ value: 'name_asc', label: 'Name A–Z' }, { value: 'name_desc', label: 'Name Z–A' }, { value: 'images_asc', label: 'Fewest images first' }, { value: 'images_desc', label: 'Most images first' }, { value: 'newest', label: 'Newest product first' }]} /><Button onClick={() => setRefresh(x => x + 1)}>Refresh</Button></Space>
      <Table<Product> loading={loading} dataSource={health?.products || []} rowKey="id" scroll={{ x: 650 }} pagination={false} columns={[
        { title: 'Preview', key: 'preview', width: 100, render: (_, p) => <Image width={64} height={75} style={{ objectFit: 'contain' }} src={p.imageUrl || '/placeholder.svg'} alt={p.name} /> },
        { title: 'Product', key: 'product', render: (_, p) => <><Button type="link" style={{ padding: 0, whiteSpace: 'normal', textAlign: 'left', height: 'auto' }} onClick={() => setParams({ product: p.id })}>{p.name}</Button><br /><Typography.Text type="secondary">#{p.id} · {p.brand || 'No brand'}</Typography.Text></> },
        { title: 'Review', key: 'status', render: (_, p) => <Tag>{labels[p.status]}</Tag> }, { title: 'Images', dataIndex: 'imageCount' },
        { title: 'Actions', key: 'actions', render: (_, p) => <Button onClick={() => setParams({ product: p.id })}>Manage images</Button> },
      ]} /><Pagination style={{ marginTop: 20 }} current={page} total={health?.meta.total || 0} pageSize={24} showSizeChanger={false} onChange={setPage} showTotal={total => `${total} products`} />
    </> }, { key: 'candidates', label: `Candidate decisions (${candidates.length})`, children: <>
      <Alert type="info" showIcon message="Decisions do not replace product images. Use Manage images to upload and choose a primary photo." style={{ marginBottom: 16 }} /><Input placeholder="Find candidate product, brand or ID" allowClear value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} />
      <Table<Candidate> rowKey={c => `${c.product_id}:${c.candidate_rank}`} dataSource={visibleCandidates} scroll={{ x: 700 }} pagination={{ pageSize: 12, showSizeChanger: true }} columns={[
        { title: 'Product', key: 'product', render: (_, c) => <>{c.current_name}<br /><Typography.Text type="secondary">#{c.product_id} · {c.brand} · candidate {c.candidate_rank}</Typography.Text><br /><Button onClick={() => setParams({ product: String(c.product_id) })}>Manage images</Button></> },
        { title: 'Click to compare', key: 'compare', render: (_, c) => <Image.PreviewGroup><Space><div>Current<br /><Image width={100} height={110} style={{ objectFit: 'contain' }} src={c.current_image_url || '/placeholder.svg'} /></div><div>Candidate<br /><Image width={100} height={110} style={{ objectFit: 'contain' }} src={c.preview_url || c.source_image_url} /></div></Space></Image.PreviewGroup> },
        { title: 'Decision', key: 'decision', render: (_, c) => <><Tag color={c.admin_review?.status === 'approved' ? 'green' : c.admin_review?.status === 'rejected' ? 'red' : 'gold'}>{c.admin_review?.status || 'pending'}</Tag><p>{c.admin_review?.note}</p><Space wrap>{['approved', 'rejected', 'pending'].map(value => <Button key={value} disabled={busy} onClick={() => { setDecision({ candidate: c, status: value }); setNote(c.admin_review?.note || ''); }}>{value === 'approved' ? 'Approve' : value === 'rejected' ? 'Reject' : 'Undo decision'}</Button>)}</Space></> },
      ]} />
    </> }]} />
    <Drawer title={gallery?.product.name || 'Product image manager'} open={!!productId} width={800} onClose={() => { setParams({}); setGallery(undefined); }}>
      {galleryLoading ? <Spin /> : gallery && <><Space wrap style={{ marginBottom: 20 }}><Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} beforeUpload={file => { void upload(file); return false; }} disabled={busy}><Button type="primary" loading={busy}>Add another image</Button></Upload><Typography.Text type="secondary">Up to 10 MB · uploads are added, not replaced</Typography.Text></Space>{!gallery.images.length && <Empty description="No images yet. Add the first product photo." />}
      <Image.PreviewGroup>{gallery.images.map(asset => <Card key={asset.id} style={{ marginBottom: 16 }}><Space align="start" wrap><Image src={asset.url} alt={asset.alt || gallery.product.name} width={170} height={180} style={{ objectFit: 'contain' }} /><div style={{ maxWidth: 470 }}><Space wrap><Tag color={asset.is_primary ? 'blue' : undefined}>{asset.is_primary ? 'Primary image' : asset.variant}</Tag><Tag>{asset.review_status || 'legacy'}</Tag><Typography.Text type="secondary">#{asset.id} · position {asset.sort_order}</Typography.Text></Space><p>{asset.alt || 'No description yet'}</p><Space wrap>
        <Button onClick={() => setEditAsset({ ...asset })}>Edit details / order</Button><Button onClick={() => openEditor(asset.url)}>Crop / rotate</Button><Button href={asset.url} target="_blank" rel="noreferrer">Open original</Button>
        {!asset.is_primary && <Popconfirm title="Use this as the primary product image?" description="The current image stays in the gallery." onConfirm={() => updateAsset(asset, { make_primary: true }).then(() => {})}><Button disabled={busy}>Make primary</Button></Popconfirm>}
        <Button disabled={busy || asset.review_status === 'approved'} onClick={() => void updateAsset(asset, { review_status: 'approved' })}>Mark reviewed</Button>
      </Space></div></Space></Card>)}</Image.PreviewGroup></>}
    </Drawer>
    <Modal title="Save candidate decision" open={!!decision} confirmLoading={busy} onCancel={() => setDecision(undefined)} onOk={async () => { if (decision && await mutate(`catalog-image-candidates/${decision.candidate.product_id}/approve`, { rank: decision.candidate.candidate_rank, status: decision.status, note, audit })) setDecision(undefined); }}><p>{decision?.candidate.current_name}: <strong>{decision?.status}</strong></p><Input.TextArea aria-label="Review note" placeholder="Check size, shade and packaging. Explain your decision." rows={4} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} /></Modal>
    <Modal title="Image description and order" open={!!editAsset} confirmLoading={busy} onCancel={() => setEditAsset(undefined)} onOk={async () => { if (editAsset && await updateAsset(editAsset, { alt: editAsset.alt, sort_order: editAsset.sort_order, review_status: ['approved', 'needs_review', 'rejected'].includes(editAsset.review_status) ? editAsset.review_status : 'needs_review' })) setEditAsset(undefined); }}><p>Image description</p><Input maxLength={255} value={editAsset?.alt || ''} onChange={e => setEditAsset(a => a && ({ ...a, alt: e.target.value }))} /><p>Gallery position (lower numbers first)</p><InputNumber min={0} max={10000} value={editAsset?.sort_order} onChange={v => setEditAsset(a => a && ({ ...a, sort_order: v || 0 }))} /><p>Review status (does not hide the image)</p><Select style={{ width: '100%' }} value={editAsset?.review_status || 'needs_review'} options={['needs_review', 'approved', 'rejected'].map(value => ({ value, label: value.replace('_', ' ') }))} onChange={v => setEditAsset(a => a && ({ ...a, review_status: v }))} /></Modal>
    <Modal title="Edit image — save a new copy" open={!!editSource} width={700} confirmLoading={busy} okText="Save edited copy" okButtonProps={{ disabled: !!editorError }} onCancel={() => setEditSource(undefined)} onOk={() => { canvas.current?.toBlob(async blob => { if (blob && await upload(new File([blob], 'edited-product.webp', { type: 'image/webp' }))) setEditSource(undefined); }, 'image/webp', 0.92); }}>
      {editorError && <Alert type="info" message={editorError} />}<canvas ref={canvas} style={{ display: 'block', maxWidth: '100%', maxHeight: 400, margin: '16px auto', background: '#f5f5f5' }} /><Space wrap><Button onClick={() => setRotation(r => (r + 270) % 360)}>Rotate left</Button><Button onClick={() => setRotation(r => (r + 90) % 360)}>Rotate right</Button><Switch checked={square} onChange={setSquare} checkedChildren="Square crop" unCheckedChildren="Original shape" /></Space><p>Zoom / centered crop</p><Slider min={1} max={3} step={0.1} value={zoom} onChange={setZoom} /><Typography.Text type="secondary">Originals stay unchanged. Choose Make primary after saving to use the edited copy as the storefront photo.</Typography.Text>
    </Modal>
  </Space>;
}

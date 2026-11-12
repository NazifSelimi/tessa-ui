/**
 * Post Studio "Product photo" tab: clean a picture found online for a product
 * that has no photo — remove the background, crop, fit it in the middle of a
 * white or see-through square — then download it or add it to a product.
 *
 * Adding never replaces anything: the picture is uploaded as an extra photo of
 * the product (same admin upload as Catalog images) and the admin picks the
 * main photo there.
 */
import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Image, Modal, Select, Space, Switch, Tag, Typography, Upload } from 'antd';
import { DownloadOutlined, EditOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ProductPhotoEditor from './ProductPhotoEditor';

const { Paragraph, Text } = Typography;
const API = import.meta.env.VITE_API_URL as string;

export interface PhotoProductOption { value: string; label: string; name: string; hasPhoto: boolean }

interface Props {
  products: PhotoProductOption[];
  loading?: boolean;
  /** False while the tab is hidden, so pasting elsewhere does not open the editor. */
  active: boolean;
}

interface Result { blob: Blob; ext: 'png' | 'webp'; url: string }

export default function ProductPhotoTab({ products, loading, active }: Props) {
  const { message } = App.useApp();
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [productId, setProductId] = useState<string | undefined>();
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<{ id: string; name: string } | null>(null);

  const open = (picked: File) => {
    if (!picked.type.startsWith('image/')) { message.error('Choose a picture (JPG, PNG or WebP).'); return; }
    setFile(picked);
    setEditorOpen(true);
  };

  // Paste a picture copied from a website (right-click → Copy image).
  useEffect(() => {
    if (!active) return undefined;
    const onPaste = (event: ClipboardEvent) => {
      const item = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (item) { event.preventDefault(); open(item); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // open only uses setters and message
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const options = products.filter((p) => !onlyMissing || !p.hasPhoto || p.value === productId);
  const chosen = products.find((p) => p.value === productId);

  const download = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `${(chosen?.name || 'product').toLowerCase().replace(/[^a-z0-9а-ш]+/gi, '-').replace(/^-|-$/g, '').slice(0, 50) || 'product'}.${result.ext}`;
    link.click();
  };

  const upload = async () => {
    if (!result || !chosen) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append('image', new File([result.blob], `studio-product.${result.ext}`, { type: `image/${result.ext}` }));
      data.append('alt', chosen.name);
      const response = await fetch(`${API}/v1/admin/products/${chosen.value}/images`, {
        method: 'POST', body: data, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.status === 413) throw new Error('The server rejected this file size. Try the white background (smaller file).');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Upload failed. Please try again.');
      setAdded({ id: chosen.value, name: chosen.name });
      message.success(`Added to ${chosen.name} as an extra photo`);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmUpload = () => {
    if (!chosen) return;
    Modal.confirm({
      title: `Add this photo to “${chosen.name}”?`,
      content: chosen.hasPhoto
        ? 'It is added as an extra photo. The current photos stay as they are; you choose the main photo in Catalog images.'
        : 'This product has no photo yet. The picture is added as its photo; you can change or remove it in Catalog images.',
      okText: 'Add photo',
      onOk: upload,
    });
  };

  return (
    <div className="post-studio__photo-tab">
      <Card size="small" title="Clean a product photo">
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          For products without a photo: save a picture from the web, drop it here, remove the background, crop and fit it,
          then add it to the product. Original product photos are never replaced.
        </Paragraph>
        <Upload.Dragger
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          showUploadList={false}
          beforeUpload={(picked) => { open(picked); return false; }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Drop a picture here, click to choose one, or paste it (Ctrl/⌘ + V)</p>
          <p className="ant-upload-hint">From a website: right-click the picture → Save image (or Copy image), then drop / paste it here.</p>
        </Upload.Dragger>
      </Card>

      {result && (
        <Card size="small" title="Cleaned photo · 1200 × 1200" style={{ marginTop: 16 }}>
          <div className="post-studio__photo-result">
            <Image src={result.url} alt="Cleaned product photo" width={260} height={260} className="post-studio__photo-checker" />
            <Space direction="vertical" size={12} style={{ flex: 1, minWidth: 240 }}>
              <Space wrap>
                <Button icon={<EditOutlined />} onClick={() => setEditorOpen(true)}>Edit again</Button>
                <Button icon={<DownloadOutlined />} onClick={download}>Download</Button>
              </Space>
              <div>
                <Text strong>Add to a product</Text>
                <Space wrap align="center" style={{ display: 'flex', margin: '6px 0' }}>
                  <Switch size="small" checked={onlyMissing} onChange={setOnlyMissing} />
                  <Text type="secondary">Only products without a photo</Text>
                </Space>
                <Select
                  showSearch
                  allowClear
                  loading={loading}
                  value={productId}
                  onChange={(value) => { setProductId(value); setAdded(null); }}
                  options={options.map((p) => ({ value: p.value, label: p.label }))}
                  optionFilterProp="label"
                  placeholder="Search a product"
                  style={{ width: '100%' }}
                  notFoundContent={onlyMissing ? 'No product without a photo matches' : undefined}
                />
                {chosen && (
                  <div style={{ marginTop: 6 }}>
                    {chosen.hasPhoto ? <Tag color="gold">Has photos — this is added as an extra one</Tag> : <Tag color="red">No photo yet</Tag>}
                  </div>
                )}
              </div>
              <Button type="primary" icon={<PlusOutlined />} disabled={!chosen} loading={busy} onClick={confirmUpload}>Add to product</Button>
              {added && (
                <Alert
                  type="success"
                  showIcon
                  message={<>Added to {added.name}. <Link to={`/admin/catalog-images?product=${added.id}`}>Open its photos</Link> to choose the main one.</>}
                />
              )}
            </Space>
          </div>
        </Card>
      )}

      <ProductPhotoEditor
        open={editorOpen && !!file}
        file={file}
        title="Clean the photo — background, crop, fit, square"
        onCancel={() => setEditorOpen(false)}
        onSave={(blob, ext) => {
          setResult({ blob, ext, url: URL.createObjectURL(blob) });
          setAdded(null);
          setEditorOpen(false);
        }}
      />
    </div>
  );
}

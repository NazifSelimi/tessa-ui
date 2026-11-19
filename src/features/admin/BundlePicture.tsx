/**
 * The picture a bundle shows in the shop: see it, upload an own image, open it
 * in Post Studio to make or change it, or remove it (the shop then shows the
 * plain offer card). Used in Admin → Offers & Bundles.
 */
import { Button, Image, Popconfirm, Space, Typography, Upload, App } from 'antd';
import { DeleteOutlined, EditOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useDeleteBundleImageMutation, useUploadBundleImageMutation } from '@/features/admin/api';
import { extractErrorMessage } from '@/shared/utils/error';
import type { StoreBundle } from '@/types';

const { Text } = Typography;

const ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_MB = 5;

/** Picture URL with the bundle's update time, so a new picture is not served from the browser cache. */
export const bundlePictureUrl = (bundle: Pick<StoreBundle, 'image' | 'updatedAt'>) =>
  (bundle.image ? `${bundle.image}?v=${encodeURIComponent(bundle.updatedAt ?? '')}` : null);

/** Where Post Studio opens this bundle as an editable post (Create tab). */
export const studioLinkFor = (bundleId: string) => `/admin/studio?tab=create&bundle=${encodeURIComponent(bundleId)}`;

export function BundlePictureThumb({ bundle }: { bundle: StoreBundle }) {
  const url = bundlePictureUrl(bundle);
  return url
    ? <Image src={url} width={48} height={60} style={{ objectFit: 'cover', borderRadius: 6 }} alt={bundle.name} />
    : <div style={{ width: 48, height: 60, borderRadius: 6, background: '#f4f1f2', display: 'grid', placeItems: 'center', color: '#b3aaad' }} title="No picture"><PictureOutlined /></div>;
}

export default function BundlePicture({ bundle }: { bundle: StoreBundle }) {
  const { message } = App.useApp();
  const [upload, { isLoading: uploading }] = useUploadBundleImageMutation();
  const [remove, { isLoading: removing }] = useDeleteBundleImageMutation();
  const url = bundlePictureUrl(bundle);

  const onFile = async (file: File) => {
    if (!ACCEPT.split(',').includes(file.type)) {
      message.error('Use a PNG, JPG or WebP image.');
      return false;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      message.error(`The image is over ${MAX_MB} MB.`);
      return false;
    }
    try {
      await upload({ id: bundle.id, image: file }).unwrap();
      message.success('Picture saved');
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
    return false; // handled here, antd must not upload it again
  };

  return (
    <Space align="start" size={16} wrap>
      <div style={{ width: 160, aspectRatio: '4 / 5', borderRadius: 10, overflow: 'hidden', background: '#f4f1f2', display: 'grid', placeItems: 'center' }}>
        {url
          ? <Image src={url} alt={bundle.name} width={160} style={{ objectFit: 'cover', aspectRatio: '4 / 5' }} />
          : <Space direction="vertical" align="center" size={4} style={{ color: '#9a9396' }}><PictureOutlined style={{ fontSize: 28 }} /><Text type="secondary" style={{ fontSize: 12 }}>No picture</Text></Space>}
      </div>
      <Space direction="vertical" size={8}>
        <Upload accept={ACCEPT} showUploadList={false} beforeUpload={onFile}>
          <Button icon={<UploadOutlined />} loading={uploading}>{url ? 'Replace with my image' : 'Upload my image'}</Button>
        </Upload>
        <Link to={studioLinkFor(bundle.id)}>
          <Button icon={<EditOutlined />}>{url ? 'Change in Post Studio' : 'Make in Post Studio'}</Button>
        </Link>
        <Popconfirm title="Remove this picture?" description="The shop shows the plain offer card instead." okText="Remove" onConfirm={async () => {
          try { await remove(bundle.id).unwrap(); message.success('Picture removed'); } catch (error) { message.error(extractErrorMessage(error)); }
        }} disabled={!url}>
          <Button danger icon={<DeleteOutlined />} disabled={!url} loading={removing}>Remove picture</Button>
        </Popconfirm>
        <Text type="secondary" style={{ fontSize: 12, maxWidth: 260, display: 'block' }}>
          Shown on top of this offer in the shop. Best size 1080 × 1350 (4:5), up to {MAX_MB} MB.
        </Text>
      </Space>
    </Space>
  );
}

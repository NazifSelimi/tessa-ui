/**
 * Post Studio → Bundles: one ready picture per bundle, made with the Offer
 * layout (bundle name, "-10%" sticker, "together X instead of Y", up to three
 * product photos) and saved on the server with the bundle, so every admin sees
 * the same pictures. "Edit in Create" opens the bundle as a normal post for
 * hand changes; that post can be downloaded, not saved here.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Card, Empty, Popconfirm, Progress, Segmented, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined, PictureOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useDeleteBundleImageMutation, useUploadBundleImageMutation } from '@/features/admin/api';
import { formatDate } from '@/shared/utils/formatDate';
import type { StoreBundle } from '@/types';
import { OFFER_MAX_PRODUCTS, bundlePost } from './bundlePost';
import {
  FORMATS, THEMES, formatById, loadImage, loadLogo, renderDesign, templateDefaults, themeById,
  type FormatId, type StudioDesign, type StudioLang, type StudioProduct, type ThemeId,
} from './render';

const { Text, Paragraph } = Typography;

const SETTINGS_KEY = 'tessa.studio.bundles.v1';

interface Settings { lang: StudioLang; format: FormatId; theme: ThemeId }
type Show = 'all' | 'active' | 'missing';

const DEFAULTS: Settings = { lang: 'mk', format: 'portrait', theme: 'blush' };

const readSettings = (): Settings => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null');
    return parsed && typeof parsed === 'object' ? { ...DEFAULTS, ...parsed } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

const writeSettings = (settings: Settings) => {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Blocked storage: the choices are just not remembered.
  }
};

const isLive = (bundle: StoreBundle) => bundle.isActive && (!bundle.endsAt || new Date(bundle.endsAt) > new Date());

/** Picture URL with the bundle's update time, so a remade picture is not served from the browser cache. */
const pictureUrl = (bundle: StoreBundle) => (bundle.image ? `${bundle.image}?v=${encodeURIComponent(bundle.updatedAt ?? '')}` : null);

const fileName = (bundle: StoreBundle, ext: string) =>
  `bundle-${bundle.id}-${bundle.name.toLowerCase().replace(/[^a-z0-9а-ш]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post'}.${ext}`;

interface Props {
  bundles: StoreBundle[];
  /** Post Studio's starting design in a language (logo, call to action, …). */
  baseDesign: (lang: StudioLang) => StudioDesign;
  /** Loads products with all their photos. */
  loadProducts: (ids: string[]) => Promise<StudioProduct[]>;
  /** Opens the bundle in Create as an editable post. */
  onEdit: (bundle: StoreBundle) => void;
  /** Fonts and catalogue are loaded (pictures made earlier would use fallback fonts). */
  ready: boolean;
}

export default function BundlesTab({ bundles, baseDesign, loadProducts, onEdit, ready }: Props) {
  const { message } = App.useApp();
  const [settings, setSettings] = useState<Settings>(() => readSettings());
  const [show, setShow] = useState<Show>('all');
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const stopBatch = useRef(false);
  const [uploadImage] = useUploadBundleImageMutation();
  const [deleteImage] = useDeleteBundleImageMutation();

  useEffect(() => writeSettings(settings), [settings]);
  useEffect(() => () => { stopBatch.current = true; }, []);

  const change = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));

  // Live bundles first, then by name.
  const sorted = useMemo(() => [...bundles].sort((a, b) => Number(isLive(b)) - Number(isLive(a)) || a.name.localeCompare(b.name)), [bundles]);
  const visible = sorted.filter((bundle) => (show === 'active' ? isLive(bundle) : show === 'missing' ? !bundle.image : true));
  const missing = sorted.filter((bundle) => !bundle.image);

  const setBusyFor = (id: string, on: boolean) => setBusy((current) => {
    const next = new Set(current);
    if (on) next.add(id); else next.delete(id);
    return next;
  });

  /** Draws the bundle's Offer post at full size. */
  const draw = async (bundle: StoreBundle): Promise<HTMLCanvasElement> => {
    const post = bundlePost(bundle, settings.lang);
    const base = baseDesign(settings.lang);
    const design: StudioDesign = {
      ...base,
      ...templateDefaults('offer', settings.lang),
      ...post.design,
      format: settings.format,
      theme: settings.theme,
      elements: [],
      qr: false,
    };
    const products = await loadProducts(post.productIds);
    const theme = themeById(design.theme);
    const [withImages, logo] = await Promise.all([
      Promise.all(products.map(async (product) => ({ ...product, image: await loadImage(product.photos[product.photoIndex]) }))),
      loadLogo(theme.photo === 'card' ? '#ffffff' : '#242124'),
    ]);
    const canvas = document.createElement('canvas');
    renderDesign(canvas, design, { products: withImages, background: null, logo, qr: null });
    return canvas;
  };

  const toBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The picture could not be made.'))), 'image/webp', 0.9);
    } catch (error) {
      // A photo from another site without permission "taints" the canvas.
      reject(error instanceof Error ? error : new Error('The picture could not be made.'));
    }
  });

  /** Makes and saves one bundle's picture; true when it worked. */
  const make = async (bundle: StoreBundle, quiet = false): Promise<boolean> => {
    setBusyFor(bundle.id, true);
    try {
      const blob = await toBlob(await draw(bundle));
      await uploadImage({ id: bundle.id, image: blob }).unwrap();
      if (!quiet) message.success(`Picture saved for "${bundle.name}"`);
      return true;
    } catch (error) {
      message.error(`"${bundle.name}": ${error instanceof Error ? error.message : 'the picture was not saved'}`);
      return false;
    } finally {
      setBusyFor(bundle.id, false);
    }
  };

  const makeMany = async (list: StoreBundle[]) => {
    if (!list.length) return;
    stopBatch.current = false;
    setBatch({ done: 0, total: list.length });
    let saved = 0;
    for (const [index, bundle] of list.entries()) {
      if (stopBatch.current) break;
      if (await make(bundle, true)) saved += 1;
      setBatch({ done: index + 1, total: list.length });
    }
    setBatch(null);
    message.success(`${saved} of ${list.length} bundle pictures saved`);
  };

  const download = async (bundle: StoreBundle) => {
    const url = pictureUrl(bundle);
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName(bundle, blob.type === 'image/png' ? 'png' : 'webp');
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };

  const remove = async (bundle: StoreBundle) => {
    try {
      await deleteImage(bundle.id).unwrap();
      message.success('Picture removed');
    } catch {
      message.error('The picture was not removed');
    }
  };

  const format = formatById(settings.format);
  const running = batch !== null;

  if (!bundles.length) {
    return <Empty description="No bundles yet. Make them in Admin → Bundles, then come back here for their pictures." />;
  }

  return (
    <div className="studio-bundles">
      <Card size="small">
        <Space wrap size={[16, 12]} align="center">
          <Segmented<StudioLang>
            value={settings.lang}
            onChange={(lang) => change({ lang })}
            options={[{ value: 'mk', label: 'MK' }, { value: 'sq', label: 'SQ' }, { value: 'en', label: 'EN' }]}
            aria-label="Language of the pictures"
          />
          <Select<FormatId>
            value={settings.format}
            onChange={(value) => change({ format: value })}
            style={{ width: 190 }}
            options={FORMATS.map((item) => ({ value: item.id, label: `${item.label} · ${item.hint}` }))}
            aria-label="Picture size"
          />
          <Select<ThemeId>
            value={settings.theme}
            onChange={(value) => change({ theme: value })}
            style={{ width: 150 }}
            options={THEMES.map((item) => ({ value: item.id, label: item.label }))}
            aria-label="Colours"
          />
          <Segmented<Show>
            value={show}
            onChange={setShow}
            options={[
              { value: 'all', label: `All (${bundles.length})` },
              { value: 'active', label: 'Live' },
              { value: 'missing', label: `No picture (${missing.length})` },
            ]}
          />
          <Button type="primary" icon={<ThunderboltOutlined />} disabled={!ready || running || !missing.length} onClick={() => makeMany(missing)}>
            Make missing pictures ({missing.length})
          </Button>
          <Popconfirm
            title="Remake every bundle picture?"
            description="Each saved picture is replaced with one in the language, size and colours chosen here."
            okText="Remake all"
            onConfirm={() => makeMany(sorted)}
            disabled={!ready || running}
          >
            <Button icon={<ReloadOutlined />} disabled={!ready || running}>Remake all</Button>
          </Popconfirm>
        </Space>
        {batch && (
          <Space style={{ marginTop: 12, width: '100%' }} align="center">
            <Progress percent={Math.round((batch.done / batch.total) * 100)} style={{ width: 260, margin: 0 }} size="small" />
            <Text type="secondary">{batch.done} / {batch.total}</Text>
            <Button size="small" onClick={() => { stopBatch.current = true; }}>Stop</Button>
          </Space>
        )}
        <Paragraph type="secondary" style={{ fontSize: 12, margin: '10px 0 0' }}>
          Pictures use the Offer layout with up to {OFFER_MAX_PRODUCTS} products (the ones with photos first) and are saved with the bundle.
          For hand changes use <strong>Edit in Create</strong>, download the post there, and keep it.
        </Paragraph>
      </Card>

      {visible.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Every bundle here has a picture." style={{ marginTop: 24 }} />
      ) : (
        <div className="studio-bundles__grid">
          {visible.map((bundle) => {
            const url = pictureUrl(bundle);
            const working = busy.has(bundle.id);
            const noPhoto = bundle.products.filter((item) => !item.image).length;
            return (
              <Card
                key={bundle.id}
                size="small"
                className="studio-bundles__card"
                cover={(
                  <div className="studio-bundles__picture" style={{ aspectRatio: `${format.width} / ${format.height}` }}>
                    {url ? <img src={url} alt={bundle.name} loading="lazy" /> : (
                      <div className="studio-bundles__empty"><PictureOutlined /><span>No picture yet</span></div>
                    )}
                  </div>
                )}
                actions={[
                  <Tooltip key="make" title={url ? 'Make it again with the settings above' : 'Make and save the picture'}>
                    <Button type="text" size="small" icon={url ? <ReloadOutlined /> : <ThunderboltOutlined />} loading={working} disabled={!ready || (running && !working)} onClick={() => make(bundle)}>
                      {url ? 'Remake' : 'Make'}
                    </Button>
                  </Tooltip>,
                  <Tooltip key="download" title="Download the picture">
                    <Button type="text" size="small" icon={<DownloadOutlined />} disabled={!url} onClick={() => download(bundle)} aria-label="Download" />
                  </Tooltip>,
                  <Tooltip key="edit" title="Open as a post in Create to change it by hand">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(bundle)} aria-label="Edit in Create" />
                  </Tooltip>,
                  <Popconfirm key="remove" title="Remove this picture?" okText="Remove" onConfirm={() => remove(bundle)} disabled={!url}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={!url} aria-label="Remove picture" />
                  </Popconfirm>,
                ]}
              >
                <Text strong ellipsis={{ tooltip: bundle.name }} style={{ display: 'block' }}>{bundle.name}</Text>
                <Space size={[4, 4]} wrap style={{ marginTop: 6 }}>
                  {isLive(bundle) ? <Tag color="green">Live</Tag> : <Tag>{bundle.isActive ? 'Ended' : 'Draft'}</Tag>}
                  {bundle.audience === 'stylist' && <Tag color="purple">Salons</Tag>}
                  <Tag>{bundle.products.length} products</Tag>
                  {bundle.endsAt && <Text type="secondary" style={{ fontSize: 12 }}>until {formatDate(new Date(bundle.endsAt))}</Text>}
                </Space>
                {noPhoto > 0 && (
                  <Text type="warning" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                    {noPhoto} product{noPhoto > 1 ? 's have' : ' has'} no photo
                  </Text>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

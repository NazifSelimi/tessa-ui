/**
 * Post Studio: admins make ready-to-post social images (Instagram / Facebook /
 * stories) from catalogue products in the TESSA look, download them as PNG and
 * copy a matching caption. Everything renders in the browser; nothing is saved
 * on the server. Drafts are kept in this browser only.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  App, Button, Card, Col, Empty, Input, Radio, Row, Segmented, Select, Slider, Space, Switch, Tag, Tooltip, Typography, Upload,
} from 'antd';
import {
  CopyOutlined, DeleteOutlined, DownloadOutlined, PictureOutlined, ReloadOutlined, SaveOutlined, ShareAltOutlined, SwapOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useGetAllProductsQuery } from '@/features/admin/api';
import { useLazyGetProductByIdQuery } from '@/features/products/api';
import type { Product } from '@/types';
import { formatPrice } from '@/shared/utils/formatPrice';
import {
  FORMATS, THEMES, buildCaption, ensureFonts, formatById, loadImage, loadLogo, quickBadges, renderDesign, templateDefaults, themeById,
  type FormatId, type PriceMode, type StudioDesign, type StudioLang, type StudioProduct, type TemplateId, type ThemeId,
} from '@/features/studio/render';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TEMPLATES: { id: TemplateId; label: string; hint: string; maxProducts: number }[] = [
  { id: 'spotlight', label: 'Product spotlight', hint: 'One product, big photo, price', maxProducts: 1 },
  { id: 'offer', label: 'Offer / sale', hint: 'Huge -20% or 1+1, up to 3 products', maxProducts: 3 },
  { id: 'grid', label: 'Product grid', hint: '2–4 products with names and prices', maxProducts: 4 },
  { id: 'announcement', label: 'Announcement', hint: 'Text first: delivery, holidays, news', maxProducts: 1 },
];

const LANGS: { value: StudioLang; label: string }[] = [
  { value: 'mk', label: 'Македонски' },
  { value: 'sq', label: 'Shqip' },
  { value: 'en', label: 'English' },
];

const DRAFTS_KEY = 'tessa.postStudio.drafts.v1';
const MAX_DRAFTS = 12;

interface Draft {
  id: string;
  savedAt: string;
  design: StudioDesign;
  products: { id: string; photoIndex: number }[];
  thumbnail: string;
}

const readDrafts = (): Draft[] => {
  try {
    const raw = window.localStorage.getItem(DRAFTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeDrafts = (drafts: Draft[]): boolean => {
  try {
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, MAX_DRAFTS)));
    return true;
  } catch {
    return false;
  }
};

const nameOf = (value: Product['brand'] | Product['category']) =>
  (typeof value === 'string' ? value : value?.name) ?? '';

/** Photo URLs for a post, best first: clean detail photos, then originals, then anything else. */
function photoUrls(product: Product): string[] {
  const rank: Record<string, number> = { detail: 0, transparent_master: 1, legacy: 2, original: 3, card: 9 };
  const media = [...(product.media ?? [])]
    .filter((asset) => asset.url && asset.variant !== 'card')
    .sort((a, b) => (rank[a.variant] ?? 5) - (rank[b.variant] ?? 5) || a.sortOrder - b.sortOrder);
  const urls = media.map((asset) => asset.url as string);
  if (product.image) urls.push(product.image);
  return Array.from(new Set(urls));
}

function toStudioProduct(product: Product): StudioProduct {
  return {
    id: String(product.id),
    name: product.name,
    brand: nameOf(product.brand),
    category: nameOf(product.category),
    price: Number(product.price ?? 0),
    stylistPrice: Number(product.stylistPrice ?? 0),
    photos: photoUrls(product),
    photoIndex: 0,
  };
}

const initialDesign = (lang: StudioLang = 'mk'): StudioDesign => ({
  format: 'square',
  template: 'spotlight',
  theme: 'blush',
  lang,
  ...templateDefaults('spotlight', lang),
  cta: 'tessa.mk',
  priceMode: 'retail',
  customPrice: '',
  oldPrice: '',
  showLogo: true,
  backgroundDim: 45,
});

export default function AdminPostStudioPage() {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [design, setDesign] = useState<StudioDesign>(() => initialDesign());
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() => readDrafts());
  const [fontsReady, setFontsReady] = useState(false);
  const [captionEdited, setCaptionEdited] = useState<string | null>(null);

  const { data: catalogue, isLoading: catalogueLoading } = useGetAllProductsQuery({ perPage: 1000, sort: 'name_asc' });
  const [fetchProduct] = useLazyGetProductByIdQuery();
  const template = TEMPLATES.find((item) => item.id === design.template) ?? TEMPLATES[0];
  const format = formatById(design.format);

  const update = useCallback(<K extends keyof StudioDesign>(key: K, value: StudioDesign[K]) => {
    setDesign((current) => ({ ...current, [key]: value }));
  }, []);

  useEffect(() => {
    ensureFonts().finally(() => setFontsReady(true));
  }, []);

  /* ------------------------------------------------------------ products */

  const productOptions = useMemo(() => (catalogue?.data ?? []).map((product) => ({
    value: String(product.id),
    label: `${product.name} · ${nameOf(product.brand)}${Number(product.price) > 0 ? ` · ${formatPrice(product.price)}` : ''}`,
  })), [catalogue]);

  /** Loads full product details (all photos) for the chosen ids, keeping the photo already picked. */
  const selectProducts = useCallback(async (ids: string[], photoIndexes: Record<string, number> = {}) => {
    const list = await Promise.all(ids.map(async (id) => {
      const existing = products.find((product) => product.id === id);
      if (existing) return existing;
      const fromList = catalogue?.data.find((product) => String(product.id) === id);
      try {
        const detail = await fetchProduct(id, true).unwrap();
        return { ...toStudioProduct(detail), photoIndex: photoIndexes[id] ?? 0 };
      } catch {
        return fromList ? { ...toStudioProduct(fromList), photoIndex: photoIndexes[id] ?? 0 } : null;
      }
    }));
    const chosen = list.filter((product): product is StudioProduct => product !== null);
    setProducts(chosen);
    return chosen;
  }, [catalogue, fetchProduct, products]);

  // ?product=ID (from the shop's admin bar) preselects a product and its name.
  const preselected = useRef(false);
  useEffect(() => {
    const id = searchParams.get('product');
    if (!id || preselected.current || !catalogue) return;
    preselected.current = true;
    selectProducts([id]).then((chosen) => {
      if (chosen[0]) setDesign((current) => ({ ...current, headline: chosen[0].name, subline: chosen[0].brand }));
    });
  }, [catalogue, searchParams, selectProducts]);

  const onProductsChange = (ids: string[]) => {
    const limited = ids.slice(0, template.maxProducts);
    if (ids.length > template.maxProducts) message.info(`${template.label} shows up to ${template.maxProducts} product${template.maxProducts > 1 ? 's' : ''}.`);
    const isFirstForSpotlight = design.template === 'spotlight' && products.length === 0 && limited.length === 1;
    selectProducts(limited).then((chosen) => {
      if (isFirstForSpotlight && chosen[0] && !design.headline.trim()) {
        setDesign((current) => ({ ...current, headline: chosen[0].name, subline: chosen[0].brand }));
      }
    });
  };

  const nextPhoto = (id: string) => {
    setProducts((current) => current.map((product) => (product.id === id && product.photos.length > 1
      ? { ...product, photoIndex: (product.photoIndex + 1) % product.photos.length }
      : product)));
  };

  /* ------------------------------------------------------------ template */

  const changeTemplate = (next: TemplateId) => {
    const meta = TEMPLATES.find((item) => item.id === next) ?? TEMPLATES[0];
    const defaults = templateDefaults(next, design.lang);
    const first = products[0];
    setDesign((current) => ({
      ...current,
      template: next,
      ...defaults,
      headline: next === 'spotlight' && first ? first.name : defaults.headline,
      subline: next === 'spotlight' && first ? first.brand : defaults.subline,
      priceMode: next === 'announcement' ? 'none' : current.priceMode === 'none' ? 'retail' : current.priceMode,
    }));
    if (products.length > meta.maxProducts) setProducts(products.slice(0, meta.maxProducts));
    setCaptionEdited(null);
  };

  const changeLang = (lang: StudioLang) => {
    const defaults = templateDefaults(design.template, lang);
    const first = products[0];
    setDesign((current) => ({
      ...current,
      lang,
      eyebrow: defaults.eyebrow,
      headline: current.template === 'spotlight' && first ? current.headline : defaults.headline,
      subline: current.template === 'spotlight' && first ? current.subline : defaults.subline,
      badge: current.badge ? defaults.badge || current.badge : current.badge,
    }));
    setCaptionEdited(null);
  };

  /* ------------------------------------------------------------ rendering */

  const renderToken = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fontsReady) return;
    const token = ++renderToken.current;
    setRendering(true);
    const theme = themeById(design.theme);
    const logoInk = backgroundUrl || theme.photo === 'card' ? '#ffffff' : '#242124';
    Promise.all([
      Promise.all(products.map(async (product) => ({ ...product, image: await loadImage(product.photos[product.photoIndex]) }))),
      loadImage(backgroundUrl),
      loadLogo(logoInk),
    ]).then(([withImages, background, logo]) => {
      if (token !== renderToken.current) return;
      renderDesign(canvas, design, { products: withImages, background, logo });
      setRendering(false);
    });
  }, [design, products, backgroundUrl, fontsReady]);

  /* ------------------------------------------------------------ output */

  const fileName = () => {
    const slug = (design.headline || products[0]?.name || 'post').toLowerCase().replace(/[^a-z0-9а-ш]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40);
    return `tessa-${design.format}-${slug || 'post'}.png`;
  };

  const canvasBlob = () => new Promise<Blob | null>((resolve) => {
    const canvas = canvasRef.current;
    if (!canvas) return resolve(null);
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      resolve(null);
    }
  });

  const download = async () => {
    const blob = await canvasBlob();
    if (!blob) {
      message.error('Could not export the image (a photo may come from another website).');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName();
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    message.success(`Downloaded ${format.width}×${format.height} PNG`);
  };

  const caption = captionEdited ?? buildCaption(design, products);

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      message.success('Caption copied');
    } catch {
      message.error('Copy failed — select the caption text and copy it by hand.');
    }
  };

  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';
  const share = async () => {
    const blob = await canvasBlob();
    if (!blob) return;
    const file = new File([blob], fileName(), { type: 'image/png' });
    if (!navigator.canShare?.({ files: [file] })) {
      message.info('Sharing files isn’t supported in this browser — use Download.');
      return;
    }
    try {
      await navigator.share({ files: [file], text: caption });
    } catch {
      // Closing the share sheet is not an error.
    }
  };

  /* ------------------------------------------------------------ drafts */

  const saveDraft = () => {
    const canvas = canvasRef.current;
    let thumbnail = '';
    if (canvas) {
      const thumb = document.createElement('canvas');
      const scale = 220 / Math.max(canvas.width, canvas.height);
      thumb.width = Math.round(canvas.width * scale);
      thumb.height = Math.round(canvas.height * scale);
      thumb.getContext('2d')?.drawImage(canvas, 0, 0, thumb.width, thumb.height);
      try { thumbnail = thumb.toDataURL('image/jpeg', 0.7); } catch { thumbnail = ''; }
    }
    const draft: Draft = {
      id: `${Date.now()}`,
      savedAt: new Date().toISOString(),
      design,
      products: products.map((product) => ({ id: product.id, photoIndex: product.photoIndex })),
      thumbnail,
    };
    const next = [draft, ...drafts].slice(0, MAX_DRAFTS);
    if (writeDrafts(next)) {
      setDrafts(next);
      message.success('Draft saved in this browser');
    } else {
      message.error('This browser blocked saving drafts.');
    }
  };

  const openDraft = async (draft: Draft) => {
    setDesign({ ...initialDesign(draft.design.lang), ...draft.design });
    setCaptionEdited(null);
    setProducts([]);
    const indexes = Object.fromEntries(draft.products.map((item) => [item.id, item.photoIndex]));
    const list = await Promise.all(draft.products.map(async ({ id }) => {
      try {
        const detail = await fetchProduct(id, true).unwrap();
        return { ...toStudioProduct(detail), photoIndex: indexes[id] ?? 0 };
      } catch {
        return null;
      }
    }));
    setProducts(list.filter((item): item is StudioProduct => item !== null));
  };

  const deleteDraft = (id: string) => {
    const next = drafts.filter((draft) => draft.id !== id);
    writeDrafts(next);
    setDrafts(next);
  };

  const reset = () => {
    setDesign(initialDesign(design.lang));
    setProducts([]);
    setBackgroundUrl(null);
    setCaptionEdited(null);
  };

  /* ------------------------------------------------------------ view */

  const priceOptions: { value: PriceMode; label: string }[] = [
    { value: 'retail', label: 'Retail price' },
    { value: 'salon', label: 'Salon price' },
    { value: 'custom', label: 'Custom' },
    { value: 'none', label: 'No price' },
  ];

  return (
    <div className="post-studio">
      <div className="post-studio__head">
        <div>
          <Title level={2} style={{ margin: 0 }}>Post Studio</Title>
          <Text type="secondary">Make Instagram, Facebook and story images from your products, in the Tessa look. Download, then post.</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={reset}>Start over</Button>
          <Button icon={<SaveOutlined />} onClick={saveDraft}>Save draft</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10} xl={9}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" title="1 · Size & look">
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div>
                  <Text strong className="post-studio__label">Size</Text>
                  <div className="post-studio__choices">
                    {FORMATS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`post-studio__choice${design.format === item.id ? ' is-active' : ''}`}
                        onClick={() => update('format', item.id as FormatId)}
                      >
                        <span className="post-studio__ratio" style={{ aspectRatio: `${item.width} / ${item.height}` }} />
                        <strong>{item.label}</strong>
                        <small>{item.hint}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Text strong className="post-studio__label">Layout</Text>
                  <Radio.Group value={design.template} onChange={(event) => changeTemplate(event.target.value)} className="post-studio__templates">
                    {TEMPLATES.map((item) => (
                      <Radio.Button key={item.id} value={item.id}>
                        <strong>{item.label}</strong>
                        <small>{item.hint}</small>
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>
                <div>
                  <Text strong className="post-studio__label">Colours</Text>
                  <div className="post-studio__themes">
                    {THEMES.map((theme) => (
                      <Tooltip key={theme.id} title={theme.label}>
                        <button
                          type="button"
                          aria-label={theme.label}
                          className={`post-studio__theme${design.theme === theme.id ? ' is-active' : ''}`}
                          style={{ background: `linear-gradient(135deg, ${theme.background[0]}, ${theme.background[1]})` }}
                          onClick={() => update('theme', theme.id as ThemeId)}
                        >
                          <span style={{ background: theme.accent }} />
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                <div>
                  <Text strong className="post-studio__label">Background photo (optional)</Text>
                  <Space wrap>
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
                        setBackgroundUrl(URL.createObjectURL(file));
                        return false;
                      }}
                    >
                      <Button icon={<UploadOutlined />}>{backgroundUrl ? 'Change photo' : 'Use my photo'}</Button>
                    </Upload>
                    {backgroundUrl && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => { URL.revokeObjectURL(backgroundUrl); setBackgroundUrl(null); }}>Remove</Button>}
                  </Space>
                  {backgroundUrl && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">Darken photo so text stays readable</Text>
                      <Slider min={0} max={80} value={design.backgroundDim} onChange={(value) => update('backgroundDim', value)} />
                    </div>
                  )}
                  <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 12 }}>
                    A salon or shelf photo from your phone. It stays on this computer; nothing is uploaded.
                  </Paragraph>
                </div>
              </Space>
            </Card>

            <Card size="small" title={`2 · Products (up to ${template.maxProducts})`}>
              <Select
                mode="multiple"
                showSearch
                allowClear
                loading={catalogueLoading}
                placeholder="Search a product by name or brand…"
                value={products.map((product) => product.id)}
                onChange={onProductsChange}
                options={productOptions}
                optionFilterProp="label"
                maxTagCount="responsive"
                style={{ width: '100%' }}
              />
              {products.length > 0 && (
                <div className="post-studio__picked">
                  {products.map((product) => (
                    <div key={product.id} className="post-studio__picked-item">
                      {product.photos[product.photoIndex]
                        ? <img src={product.photos[product.photoIndex]} alt="" />
                        : <span className="post-studio__nophoto"><PictureOutlined /></span>}
                      <div>
                        <Text strong ellipsis style={{ display: 'block', maxWidth: 220 }}>{product.name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {product.brand} · {product.price > 0 ? formatPrice(product.price) : 'no price'}
                          {product.stylistPrice > 0 ? ` · salon ${formatPrice(product.stylistPrice)}` : ''}
                        </Text>
                      </div>
                      <Tooltip title={product.photos.length > 1 ? `Use another photo (${product.photoIndex + 1}/${product.photos.length})` : 'Only one photo'}>
                        <Button size="small" icon={<SwapOutlined />} disabled={product.photos.length < 2} onClick={() => nextPhoto(product.id)}>
                          {product.photoIndex + 1}/{Math.max(1, product.photos.length)}
                        </Button>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <Text strong className="post-studio__label">Price on the image</Text>
                <Segmented block size="small" value={design.priceMode} onChange={(value) => update('priceMode', value as PriceMode)} options={priceOptions} />
                {design.priceMode === 'custom' && (
                  <Input style={{ marginTop: 8 }} value={design.customPrice} onChange={(event) => update('customPrice', event.target.value)} placeholder="e.g. 790 MKD" />
                )}
                {design.priceMode !== 'none' && (
                  <Input
                    style={{ marginTop: 8 }}
                    value={design.oldPrice}
                    onChange={(event) => update('oldPrice', event.target.value)}
                    placeholder="Old price, shown crossed out (optional)"
                    addonBefore="Was"
                  />
                )}
              </div>
            </Card>

            <Card size="small" title="3 · Text">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Segmented block value={design.lang} onChange={(value) => changeLang(value as StudioLang)} options={LANGS} />
                <Input addonBefore="Small title" value={design.eyebrow} onChange={(event) => update('eyebrow', event.target.value)} maxLength={40} />
                <TextArea value={design.headline} onChange={(event) => update('headline', event.target.value)} placeholder="Headline" autoSize={{ minRows: 1, maxRows: 3 }} maxLength={90} showCount />
                <TextArea value={design.subline} onChange={(event) => update('subline', event.target.value)} placeholder="Second line (optional)" autoSize={{ minRows: 1, maxRows: 4 }} maxLength={160} />
                <div>
                  <Input addonBefore="Sticker" value={design.badge} onChange={(event) => update('badge', event.target.value)} placeholder="-20%, NEW, 1+1…" maxLength={14} />
                  <Space wrap size={4} style={{ marginTop: 6 }}>
                    {quickBadges(design.lang).map((item) => (
                      <Tag.CheckableTag key={item.badge} checked={design.badge === item.badge} onChange={(checked) => update('badge', checked ? item.badge : '')}>
                        {item.label}
                      </Tag.CheckableTag>
                    ))}
                  </Space>
                </div>
                <Input addonBefore="Bottom text" value={design.cta} onChange={(event) => update('cta', event.target.value)} placeholder="tessa.mk" maxLength={40} />
                <Space>
                  <Switch checked={design.showLogo} onChange={(checked) => update('showLogo', checked)} />
                  <Text>Show TESSA logo</Text>
                </Space>
              </Space>
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={14} xl={15}>
          <div className="post-studio__preview-wrap">
            <Card size="small" className="post-studio__preview-card">
              <div className="post-studio__preview">
                <canvas
                  ref={canvasRef}
                  className={rendering ? 'is-rendering' : ''}
                  style={{ aspectRatio: `${format.width} / ${format.height}` }}
                  aria-label="Post preview"
                />
              </div>
              <div className="post-studio__actions">
                <Text type="secondary">{format.width} × {format.height} px · {format.hint}</Text>
                <Space wrap>
                  {canShareFiles && <Button icon={<ShareAltOutlined />} onClick={share}>Share</Button>}
                  <Button type="primary" icon={<DownloadOutlined />} onClick={download}>Download PNG</Button>
                </Space>
              </div>
            </Card>

            <Card
              size="small"
              title="Caption"
              extra={(
                <Space>
                  {captionEdited !== null && <Button size="small" type="link" onClick={() => setCaptionEdited(null)}>Rebuild</Button>}
                  <Button size="small" icon={<CopyOutlined />} onClick={copyCaption}>Copy</Button>
                </Space>
              )}
            >
              <TextArea value={caption} onChange={(event) => setCaptionEdited(event.target.value)} autoSize={{ minRows: 4, maxRows: 12 }} />
            </Card>

            <Card size="small" title={`Drafts in this browser (${drafts.length})`}>
              {drafts.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Saved drafts appear here." />
              ) : (
                <div className="post-studio__drafts">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="post-studio__draft">
                      <button type="button" onClick={() => openDraft(draft)} title="Open draft">
                        {draft.thumbnail ? <img src={draft.thumbnail} alt="" /> : <PictureOutlined />}
                      </button>
                      <Text ellipsis style={{ fontSize: 12, maxWidth: 110 }}>{draft.design.headline || draft.design.template}</Text>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteDraft(draft.id)} aria-label="Delete draft" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}

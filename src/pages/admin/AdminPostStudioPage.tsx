/**
 * Post Studio: admins make ready-to-post Instagram / Facebook images and
 * captions from catalogue products, in the shop's own look: pick a ready post
 * idea, see the post in a feed preview, download the PNG and copy a caption
 * written for the chosen network. Everything renders in the browser; nothing is
 * saved on the server. Drafts are kept in this browser only.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUrlState, writeUrlParam } from '@/shared/hooks/useUrlState';
import {
  App, Button, Card, Col, Drawer, Empty, Grid, Input, Radio, Tabs, Row, Segmented, Select, Slider, Space, Spin, Switch, Tag, Tooltip, Typography, Upload,
} from 'antd';
import {
  AppstoreOutlined, ArrowDownOutlined, BgColorsOutlined, EditOutlined, FolderOpenOutlined, QuestionCircleOutlined, ArrowUpOutlined, BulbOutlined, ClearOutlined, FontSizeOutlined, RedoOutlined, CopyOutlined, HighlightOutlined, DeleteOutlined, DownloadOutlined, FacebookFilled, InstagramOutlined, PictureOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, ScissorOutlined, ShareAltOutlined, SwapOutlined, SyncOutlined, UndoOutlined, UploadOutlined,
} from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import CropModal from '@/features/studio/CropModal';
import StudioHelp from '@/features/studio/StudioHelp';
import { lazyWithReload } from '@/shared/utils/chunkReload';
import { getBrandKit } from '@/features/studio/brand';
import { cutoutPng, getCutout } from '@/features/studio/cutout';
import { EMOJIS, SHAPES, elementLabel, makeElement, type ShapeKind, type StudioElement } from '@/features/studio/elements';
import { INFO_OPTIONS, badgeChoices, benefitChoices, ctaChoices, productSize, suggestBenefits, type InfoMode } from '@/features/studio/info';
import '@/features/studio/studio.css';
import PostMockup from '@/features/studio/PostMockup';
import {
  INSTAGRAM_LIMITS, TONES, buildCaption, countHashtags, previewCut, siteHost, suggestHashtags, toHashtag,
  type Platform, type Tone,
} from '@/features/studio/caption';
import { IDEAS, IDEA_GROUPS, ideaById, ideaText, upcomingIdeas, type IdeaGroup, type PostIdea } from '@/features/studio/ideas';
import { useGetAllProductsQuery } from '@/features/admin/api';
import { useLazyGetProductByIdQuery } from '@/features/products/api';
import type { Product } from '@/types';
import { formatPrice } from '@/shared/utils/formatPrice';
import { site } from '@/shared/config/site';
import {
  FORMATS, THEMES, ensureFonts, formatById, loadImage, loadLogo, quickBadges, renderDesign, templateDefaults, themeById,
  DEFAULT_ADJUST, DEFAULT_CUTOUT,
  type FormatId, type PhotoCrop, type PhotoHitBox, type PriceMode, type StudioDesign, type StudioLang, type StudioProduct, type TemplateId, type ThemeId,
} from '@/features/studio/render';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TEMPLATES: { id: TemplateId; label: string; hint: string; maxProducts: number }[] = [
  { id: 'spotlight', label: 'Product spotlight', hint: 'One product, big photo, price', maxProducts: 1 },
  { id: 'offer', label: 'Offer / sale', hint: 'Huge -20% or 1+1, up to 3 products', maxProducts: 3 },
  { id: 'grid', label: 'Product grid', hint: '2–4 products with names and prices', maxProducts: 4 },
  { id: 'announcement', label: 'Announcement', hint: 'Text first: delivery, holidays, news', maxProducts: 1 },
  { id: 'beforeAfter', label: 'Before / After', hint: 'Two photos side by side: results', maxProducts: 2 },
  { id: 'review', label: 'Review card', hint: 'Customer quote with stars and name', maxProducts: 1 },
  { id: 'steps', label: 'Tip steps', hint: 'Numbered steps (one per line)', maxProducts: 1 },
  { id: 'thisOrThat', label: 'This or that', hint: 'Two products, let people vote', maxProducts: 2 },
  { id: 'lineup', label: 'Product lineup', hint: 'One line, all sizes, no prices', maxProducts: 6 },
];

const LANGS: { value: StudioLang; label: string }[] = [
  { value: 'mk', label: 'Македонски' },
  { value: 'sq', label: 'Shqip' },
  { value: 'en', label: 'English' },
];

const DRAFTS_KEY = 'tessa.postStudio.drafts.v1';
const PROFILE_KEY = 'postStudio.socialProfile.v1';
const MAX_DRAFTS = 12;

/** Caption settings; kept with drafts. */
interface SocialState {
  platform: Platform;
  tone: Tone;
  variant: number;
  emojis: boolean;
  /** null = use the suggested hashtags. */
  hashtags: string[] | null;
  ideaId: string | null;
}

const initialSocial = (): SocialState => ({
  platform: 'instagram', tone: 'friendly', variant: 0, emojis: true, hashtags: null, ideaId: null,
});

/** How many suggested hashtags are used before the admin changes them. */
const DEFAULT_TAG_COUNT: Record<Platform, number> = { instagram: 15, facebook: 3 };

interface SocialProfile { handle: string; pageName: string }

const defaultProfile = (): SocialProfile => {
  const instagram = site.social.instagram.replace(/\/$/, '').split('/').pop() ?? '';
  return { handle: instagram || siteHost(), pageName: site.name };
};

const readProfile = (): SocialProfile => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? 'null');
    return parsed && typeof parsed.handle === 'string' ? { ...defaultProfile(), ...parsed } : defaultProfile();
  } catch {
    return defaultProfile();
  }
};

const writeProfile = (profile: SocialProfile) => {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Private mode / blocked storage: the names just aren't remembered.
  }
};

interface Draft {
  id: string;
  savedAt: string;
  design: StudioDesign;
  products: {
    id: string; photoIndex: number; scale?: number; offsetX?: number; offsetY?: number; crop?: PhotoCrop | null;
    cutout?: boolean; tolerance?: number; erase?: { x: number; y: number }[]; shadow?: boolean;
    rotate?: number; flip?: boolean; brightness?: number; contrast?: number; saturation?: number;
  }[];
  social?: SocialState;
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
    description: [product.name, nameOf(product.category), product.description ?? '', ...Object.values(product.translations ?? {})].join(' '),
    ...DEFAULT_ADJUST,
    ...DEFAULT_CUTOUT,
    erase: [],
  };
}

let slideCounter = 0;
const nextSlideId = () => `slide-${(slideCounter += 1)}`;

/** Products of all slides, with the slide being edited taken live. */
function currentSlidesForCaption(slides: { products: StudioProduct[] }[], active: number, live: StudioProduct[]): StudioProduct[] {
  return slides.flatMap((slide, index) => (index === active ? live : slide.products));
}

/** The photo under a point, with a margin so slim bottles are easy to grab. */
function findHit(boxes: PhotoHitBox[], x: number, y: number, canvas: HTMLCanvasElement | null) {
  const margin = canvas ? Math.min(canvas.width, canvas.height) * 0.03 : 0;
  return [...boxes].reverse().find((box) => x >= box.x - margin && x <= box.x + box.w + margin
    && y >= box.y - margin && y <= box.y + box.h + margin);
}

const initialDesign = (lang: StudioLang = 'mk'): StudioDesign => ({
  format: 'portrait',
  template: 'spotlight',
  theme: 'blush',
  lang,
  ...templateDefaults('spotlight', lang),
  cta: siteHost(),
  info: 'benefits',
  benefits: [],
  promoCode: '',
  ctaText: ctaChoices(lang)[0],
  badgeText: badgeChoices(lang)[0],
  priceMode: 'retail',
  customPrice: '',
  oldPrice: '',
  showLogo: true,
  backgroundDim: 45,
  elements: [],
  qr: false,
  qrUrl: '',
});

type StudioTab = 'create' | 'canvas' | 'templates' | 'drafts' | 'help';
const STUDIO_TABS: StudioTab[] = ['create', 'canvas', 'templates', 'drafts', 'help'];
// The Figma-style editor is a big piece of code: only load it when its tab opens.
const CanvasEditor = lazyWithReload(() => import('@/features/studio/canvas/CanvasEditor'));
const CANVAS_FRAMES = FORMATS.map((format) => ({ id: format.id, label: format.label, width: format.width, height: format.height }));

export default function AdminPostStudioPage() {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [design, setDesign] = useState<StudioDesign>(() => initialDesign());
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  /** Own photos for the Before / After layout (stay on this computer). */
  const [beforeAfterUrls, setBeforeAfterUrls] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });
  const [rendering, setRendering] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() => readDrafts());
  const [fontsReady, setFontsReady] = useState(false);
  const [captionEdited, setCaptionEdited] = useState<string | null>(null);
  const [cropping, setCropping] = useState<string | null>(null);
  /** Product whose background is being erased by clicking on the preview. */
  const [erasingId, setErasingId] = useState<string | null>(null);
  /** Selected text / sticker / shape on the preview. */
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  /** Product photo clicked on the preview; its Image panel is open. */
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // Wide screens get Figma-style side panels; smaller ones open the photo tools in a drawer.
  const screens = Grid.useBreakpoint();
  const wide = !!screens.xl;
  const [toolsOpen, setToolsOpen] = useState(false);
  const [renderVersion, setRenderVersion] = useState(0);
  /** Where the selected item is on the image, for its dashed outline. */
  const [selectionBox, setSelectionBox] = useState<PhotoHitBox | null>(null);
  const [social, setSocial] = useState<SocialState>(() => initialSocial());
  const [profile, setProfile] = useState<SocialProfile>(() => readProfile());
  const [ideaGroup, setIdeaGroup] = useState<IdeaGroup | 'all'>('all');
  const [newTag, setNewTag] = useState('');
  const hitBoxesRef = useRef<PhotoHitBox[]>([]);
  const qrRef = useRef<HTMLDivElement>(null);

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

  // A photo dragged from the computer must never make the browser open it (that
  // leaves the page and loses the post): stop it everywhere on this page and use
  // a dropped image as the background photo instead. Also warn before leaving.
  useEffect(() => {
    const stop = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    const drop = (event: DragEvent) => {
      if (!event.dataTransfer?.files.length) return;
      event.preventDefault();
      const file = [...event.dataTransfer.files].find((item) => item.type.startsWith('image/'));
      if (!file) return;
      setBackgroundUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      message.success('Photo added as the background');
    };
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', drop);
    window.addEventListener('beforeunload', leave);
    return () => {
      window.removeEventListener('dragover', stop);
      window.removeEventListener('drop', drop);
      window.removeEventListener('beforeunload', leave);
    };
  }, [message]);

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
    // Take ?product off the address: after a refresh the work in progress is
    // restored from the autosave instead of being replaced by this product.
    writeUrlParam('product', null);
    selectProducts([id]).then((chosen) => {
      if (chosen[0]) setDesign((current) => ({ ...current, headline: chosen[0].name, subline: chosen[0].brand }));
    });
  }, [catalogue, searchParams, selectProducts]);

  const onProductsChange = (ids: string[]) => {
    if (erasingId && !ids.includes(erasingId)) setErasingId(null);
    const limited = ids.slice(0, template.maxProducts);
    if (ids.length > template.maxProducts) message.info(`${template.label} shows up to ${template.maxProducts} product${template.maxProducts > 1 ? 's' : ''}.`);
    const isFirstForSpotlight = design.template === 'spotlight' && products.length === 0 && limited.length === 1;
    if (design.benefits.length) update('benefits', []); // new products → suggest their own benefits
    selectProducts(limited).then((chosen) => {
      if (isFirstForSpotlight && chosen[0] && !design.headline.trim()) {
        setDesign((current) => ({ ...current, headline: chosen[0].name, subline: chosen[0].brand }));
      }
    });
  };

  const nextPhoto = (id: string) => {
    setProducts((current) => current.map((product) => (product.id === id && product.photos.length > 1
      ? { ...product, photoIndex: (product.photoIndex + 1) % product.photos.length, crop: null, erase: [] }
      : product)));
  };

  const adjustProduct = useCallback((id: string, change: Partial<Omit<StudioProduct, 'id'>>) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...change } : product)));
  }, []);

  /* --------------------------------------------- drag / Shift+drag / wheel on the preview */

  const pointer = useRef<{
    id: string; resize: boolean; startX: number; startY: number; scale: number; offsetX: number; offsetY: number; spaceW: number; spaceH: number;
    /** Set when a text / sticker / shape is being dragged. */
    element?: { x: number; y: number; size: number };
  } | null>(null);

  /* ------------------------------------------------------------ text, stickers, shapes */

  const elements = design.elements ?? [];
  const selectedElement = elements.find((item) => item.id === selectedEl) ?? null;

  const updateElement = useCallback((id: string, change: Partial<StudioElement>) => {
    setDesign((current) => ({ ...current, elements: (current.elements ?? []).map((item) => (item.id === id ? { ...item, ...change } : item)) }));
  }, []);

  const addElement = (element: StudioElement) => {
    setDesign((current) => ({ ...current, elements: [...(current.elements ?? []), element] }));
    setSelectedEl(element.id);
  };

  const removeElement = useCallback((id: string) => {
    setDesign((current) => ({ ...current, elements: (current.elements ?? []).filter((item) => item.id !== id) }));
    setSelectedEl((current) => (current === id ? null : current));
  }, []);

  /** +1 = bring forward, -1 = send back. */
  const moveLayer = (id: string, direction: 1 | -1) => {
    setDesign((current) => {
      const list = [...(current.elements ?? [])];
      const index = list.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= list.length) return current;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...current, elements: list };
    });
  };

  useEffect(() => {
    const id = selectedEl ? `el:${selectedEl}` : selectedImage;
    setSelectionBox(id ? hitBoxesRef.current.find((item) => item.id === id) ?? null : null);
  }, [selectedEl, selectedImage, renderVersion]);

  /* ------------------------------------------------------------ undo / redo */

  type Snapshot = { design: StudioDesign; products: StudioProduct[] };
  const history = useRef<{ past: Snapshot[]; future: Snapshot[]; last: Snapshot | null; skip: boolean }>({ past: [], future: [], last: null, skip: false });
  const [historyCount, setHistoryCount] = useState({ undo: 0, redo: 0 });

  // Changes are recorded once things are quiet for a moment, so a drag is one step.
  useEffect(() => {
    const h = history.current;
    if (h.skip) {
      h.skip = false;
      h.last = { design, products };
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const current = { design, products };
      if (h.last && JSON.stringify(h.last) !== JSON.stringify(current)) {
        h.past.push(h.last);
        if (h.past.length > 60) h.past.shift();
        h.future = [];
      }
      h.last = current;
      setHistoryCount({ undo: h.past.length, redo: h.future.length });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [design, products]);

  const restore = useCallback((from: 'past' | 'future') => {
    const h = history.current;
    const snapshot = h[from].pop();
    if (!snapshot) return;
    if (h.last) (from === 'past' ? h.future : h.past).push(h.last);
    h.skip = true;
    setDesign(snapshot.design);
    setProducts(snapshot.products);
    setHistoryCount({ undo: h.past.length, redo: h.future.length });
  }, []);
  const undo = useCallback(() => restore('past'), [restore]);
  const redo = useCallback(() => restore('future'), [restore]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Typing in a field keeps its own undo / delete.
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (mod && key === 'y') {
        event.preventDefault();
        redo();
      } else if (event.key === 'Escape') {
        setSelectedEl(null);
        setSelectedImage(null);
        setErasingId(null);
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEl) {
        event.preventDefault();
        removeElement(selectedEl);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, removeElement, selectedEl]);
  const [hovering, setHovering] = useState(false);

  const canvasPoint = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * canvas.width, y: ((event.clientY - rect.top) / rect.height) * canvas.height };
  };

  const hitAt = (x: number, y: number) => findHit(hitBoxesRef.current, x, y, canvasRef.current);

  const onCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event);
    if (erasingId) {
      // Magic eraser: remove the area around the clicked spot that has a similar colour.
      const target = [...hitBoxesRef.current].reverse().find((item) => item.id === erasingId
        && point.x >= item.x && point.x <= item.x + item.w && point.y >= item.y && point.y <= item.y + item.h);
      const product = products.find((item) => item.id === erasingId);
      if (target && product) {
        event.preventDefault();
        const spot = {
          x: target.source.x + ((point.x - target.x) / target.w) * target.source.w,
          y: target.source.y + ((point.y - target.y) / target.h) * target.source.h,
        };
        adjustProduct(product.id, { cutout: true, erase: [...product.erase, spot] });
      }
      return;
    }
    const box = hitAt(point.x, point.y);
    if (box?.id.startsWith('el:')) {
      const element = elements.find((item) => `el:${item.id}` === box.id);
      if (!element) return;
      event.preventDefault();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
      setSelectedEl(element.id);
      setSelectedImage(null);
      pointer.current = {
        id: box.id, resize: event.shiftKey, startX: point.x, startY: point.y, scale: 1, offsetX: 0, offsetY: 0,
        spaceW: box.spaceW, spaceH: box.spaceH, element: { x: element.x, y: element.y, size: element.size },
      };
      return;
    }
    setSelectedEl(null);
    const product = box && products.find((item) => item.id === box.id);
    setSelectedImage(product ? product.id : null);
    if (!box || !product) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a nicety; dragging still works without it.
    }
    // Offsets are stored as a share of the space the photo sits in.
    pointer.current = {
      id: product.id,
      resize: event.shiftKey,
      startX: point.x,
      startY: point.y,
      scale: product.scale,
      offsetX: product.offsetX,
      offsetY: product.offsetY,
      spaceW: box.spaceW,
      spaceH: box.spaceH,
    };
  };

  const onCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event);
    const drag = pointer.current;
    if (!drag) {
      if (!erasingId) setHovering(Boolean(hitAt(point.x, point.y)));
      return;
    }
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    if (drag.element) {
      const elementId = drag.id.slice(3);
      if (drag.resize || event.shiftKey) {
        const unit = Math.min(drag.spaceW, drag.spaceH);
        updateElement(elementId, { size: Math.min(1.2, Math.max(0.015, drag.element.size * Math.exp((dx - dy) / (unit * 0.5)))) });
      } else {
        updateElement(elementId, {
          x: Math.min(1, Math.max(0, drag.element.x + dx / drag.spaceW)),
          y: Math.min(1, Math.max(0, drag.element.y + dy / drag.spaceH)),
        });
      }
      return;
    }
    if (drag.resize || event.shiftKey) {
      // Up or right = bigger, down or left = smaller.
      const canvas = canvasRef.current;
      const unit = canvas ? Math.min(canvas.width, canvas.height) : 1000;
      const factor = Math.exp((dx - dy) / (unit * 0.5));
      adjustProduct(drag.id, { scale: Math.min(4, Math.max(0.2, drag.scale * factor)) });
    } else {
      adjustProduct(drag.id, {
        offsetX: Math.max(-1, Math.min(1, drag.offsetX + dx / Math.max(1, drag.spaceW))),
        offsetY: Math.max(-1, Math.min(1, drag.offsetY + dy / Math.max(1, drag.spaceH))),
      });
    }
  };

  const onCanvasPointerUp = () => {
    pointer.current = null;
  };

  // Mouse wheel / trackpad pinch over a product resizes it (needs a non-passive listener).
  const productsRef = useRef(products);
  useEffect(() => { productsRef.current = products; }, [products]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (event: WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      const box = findHit(hitBoxesRef.current, x, y, canvas);
      const product = box && productsRef.current.find((item) => item.id === box.id);
      if (!product) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
      setProducts((current) => current.map((item) => (item.id === product.id
        ? { ...item, scale: Math.min(4, Math.max(0.2, item.scale * factor)) }
        : item)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

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
      info: next === 'announcement' ? 'none' : current.info === 'none' ? 'benefits' : current.info,
    }));
    if (products.length > meta.maxProducts) setProducts(products.slice(0, meta.maxProducts));
    setCaptionEdited(null);
  };

  const changeLang = (lang: StudioLang) => {
    const idea = ideaById(social.ideaId);
    if (idea) {
      const text = ideaText(idea, lang, products[0]?.name);
      setDesign((current) => ({
        ...current,
        lang,
        ctaText: ctaChoices(lang)[Math.max(0, ctaChoices(current.lang).indexOf(current.ctaText))] ?? current.ctaText,
        badgeText: badgeChoices(lang)[Math.max(0, badgeChoices(current.lang).indexOf(current.badgeText))] ?? current.badgeText,
        benefits: [],
        eyebrow: text.eyebrow,
        headline: text.headline || current.headline,
        subline: text.subline,
        badge: text.badge,
      }));
      setSocial((current) => ({ ...current, hashtags: null }));
      setCaptionEdited(null);
      return;
    }
    const defaults = templateDefaults(design.template, lang);
    const first = products[0];
    setDesign((current) => ({
      ...current,
      lang,
      ctaText: ctaChoices(lang)[Math.max(0, ctaChoices(current.lang).indexOf(current.ctaText))] ?? current.ctaText,
      badgeText: badgeChoices(lang)[Math.max(0, badgeChoices(current.lang).indexOf(current.badgeText))] ?? current.badgeText,
      benefits: [],
      eyebrow: defaults.eyebrow,
      headline: current.template === 'spotlight' && first ? current.headline : defaults.headline,
      subline: current.template === 'spotlight' && first ? current.subline : defaults.subline,
      badge: current.badge ? defaults.badge || current.badge : current.badge,
    }));
    setCaptionEdited(null);
  };

  /* ------------------------------------------------------------ ready ideas */

  const applyIdea = (idea: PostIdea) => {
    const meta = TEMPLATES.find((item) => item.id === idea.template) ?? TEMPLATES[0];
    const kept = products.slice(0, meta.maxProducts);
    const text = ideaText(idea, design.lang, kept[0]?.name);
    setDesign((current) => ({
      ...current,
      template: idea.template,
      theme: idea.theme,
      format: idea.format ?? (current.format === 'story' ? 'story' : social.platform === 'instagram' ? 'portrait' : current.format),
      eyebrow: text.eyebrow,
      headline: text.headline,
      subline: text.subline,
      badge: text.badge,
      info: idea.info ?? 'benefits',
      benefits: [],
    }));
    if (kept.length !== products.length) setProducts(kept);
    setSocial((current) => ({ ...current, tone: idea.tone, ideaId: idea.id, hashtags: null, variant: 0 }));
    setCaptionEdited(null);
    if (idea.wantsProducts && kept.length === 0) {
      message.info(`${idea.label}: now pick ${meta.maxProducts > 1 ? 'products' : 'a product'} in step 2.`);
    }
  };

  const coming = useMemo(() => upcomingIdeas(30), []);
  const visibleIdeas = IDEAS.filter((idea) => ideaGroup === 'all' || idea.group === ideaGroup);

  /* ------------------------------------------------------------ platform & caption */

  const setPlatform = (platform: Platform) => {
    setSocial((current) => ({ ...current, platform, hashtags: null }));
    // Instagram crops wide images; 4:5 gets the most screen in the feed.
    if (platform === 'instagram' && design.format === 'landscape') update('format', 'portrait');
    setCaptionEdited(null);
  };

  const updateProfile = (change: Partial<SocialProfile>) => {
    setProfile((current) => {
      const next = { ...current, ...change };
      writeProfile(next);
      return next;
    });
  };

  const ideaTags = useMemo(() => {
    const idea = ideaById(social.ideaId);
    return idea ? ideaText(idea, design.lang).tags : [];
  }, [social.ideaId, design.lang]);
  const suggestedTags = useMemo(() => suggestHashtags(design, products, ideaTags), [design, products, ideaTags]);
  const hashtags = social.hashtags ?? suggestedTags.slice(0, DEFAULT_TAG_COUNT[social.platform]);
  const moreTags = suggestedTags.filter((tag) => !hashtags.includes(tag));

  const setHashtags = (next: string[]) => {
    setSocial((current) => ({ ...current, hashtags: Array.from(new Set(next.filter(Boolean))) }));
    setCaptionEdited(null);
  };

  const addTag = () => {
    const tags = newTag.split(/[\s,]+/).map(toHashtag).filter(Boolean);
    if (tags.length) setHashtags([...hashtags, ...tags]);
    setNewTag('');
  };

  const changeSocial = (change: Partial<SocialState>) => {
    setSocial((current) => ({ ...current, ...change }));
    setCaptionEdited(null);
  };

  /* ------------------------------------------------------------ rendering */

  /** Loads photos (with background removal), background, logo and before/after photos for one design. */
  const loadAssets = useCallback(async (forDesign: StudioDesign, forProducts: StudioProduct[]) => {
    const theme = themeById(forDesign.theme);
    const logoInk = backgroundUrl || theme.photo === 'card' ? '#ffffff' : '#242124';
    const [withImages, background, logo, before, after] = await Promise.all([
      Promise.all(forProducts.map(async (product) => {
        const photo = await loadImage(product.photos[product.photoIndex]);
        // Background removal runs here, in the browser; results are cached per photo + settings.
        const image = product.cutout && photo ? getCutout(photo, { tolerance: product.tolerance, erase: product.erase }) ?? photo : photo;
        return { ...product, image };
      })),
      loadImage(backgroundUrl),
      loadLogo(logoInk),
      loadImage(beforeAfterUrls.before),
      loadImage(beforeAfterUrls.after),
    ]);
    return { products: withImages, background, logo, before, after };
  }, [backgroundUrl, beforeAfterUrls]);

  const renderToken = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fontsReady) return;
    const token = ++renderToken.current;
    setRendering(true);
    loadAssets(design, products).then((assets) => {
      if (token !== renderToken.current) return;
      const qr = design.qr ? qrRef.current?.querySelector('canvas') ?? null : null;
      hitBoxesRef.current = renderDesign(canvas, design, { ...assets, qr });
      setRendering(false);
      setRenderVersion((version) => version + 1);
    });
  }, [design, products, loadAssets, fontsReady]);

  /* ------------------------------------------------------------ carousel */

  interface Slide { id: string; design: StudioDesign; products: StudioProduct[]; thumbnail: string }
  /** Empty = a single post. Otherwise every slide; the active one is edited live above. */
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);

  const thumbnailOf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const thumb = document.createElement('canvas');
    const scale = 160 / Math.max(canvas.width, canvas.height);
    thumb.width = Math.round(canvas.width * scale);
    thumb.height = Math.round(canvas.height * scale);
    thumb.getContext('2d')?.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    try { return thumb.toDataURL('image/jpeg', 0.7); } catch { return ''; }
  };

  /** The slide list with the slide being edited brought up to date. */
  const currentSlides = (): Slide[] => {
    const live: Slide = { id: slides[activeSlide]?.id ?? nextSlideId(), design, products, thumbnail: thumbnailOf() };
    return slides.length ? slides.map((slide, index) => (index === activeSlide ? live : slide)) : [live];
  };

  const openSlide = (list: Slide[], index: number) => {
    const target = list[index];
    if (!target) return;
    setSlides(list);
    setActiveSlide(index);
    setSelectedEl(null);
    setErasingId(null);
    // Every slide in a carousel has the same size.
    setDesign({ ...target.design, format: design.format });
    setProducts(target.products);
  };

  const addSlide = (duplicate: boolean) => {
    const list = currentSlides();
    if (list.length >= 10) {
      message.info('Instagram allows up to 10 slides in one post.');
      return;
    }
    const fresh: Slide = duplicate
      ? { id: nextSlideId(), design: { ...design, elements: design.elements.map((item) => ({ ...item, id: `${item.id}c` })) }, products, thumbnail: '' }
      : { id: nextSlideId(), design: { ...design, elements: [], headline: '', subline: '', eyebrow: '', badge: '' }, products: [], thumbnail: '' };
    const next = [...list.slice(0, activeSlide + 1), fresh, ...list.slice(activeSlide + 1)];
    openSlide(next, activeSlide + 1);
  };

  const moveSlide = (direction: -1 | 1) => {
    const list = currentSlides();
    const target = activeSlide + direction;
    if (target < 0 || target >= list.length) return;
    [list[activeSlide], list[target]] = [list[target], list[activeSlide]];
    setSlides(list);
    setActiveSlide(target);
  };

  const deleteSlide = () => {
    const list = currentSlides();
    if (list.length <= 1) return;
    const next = list.filter((_, index) => index !== activeSlide);
    if (next.length === 1) {
      setSlides([]);
      setActiveSlide(0);
      setDesign({ ...next[0].design, format: design.format });
      setProducts(next[0].products);
      return;
    }
    openSlide(next, Math.min(activeSlide, next.length - 1));
  };

  /** Every slide as a numbered PNG, downloaded one after another (no zip library needed). */
  const exportSlides = async () => {
    const list = currentSlides();
    const base = fileName().replace(/\.png$/, '');
    for (let index = 0; index < list.length; index += 1) {
      const slide = list[index];
      const slideDesign = { ...slide.design, format: design.format };
      const canvas = document.createElement('canvas');
      const assets = await loadAssets(slideDesign, slide.products);
      const qr = slideDesign.qr ? qrRef.current?.querySelector('canvas') ?? null : null;
      renderDesign(canvas, slideDesign, { ...assets, qr });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${base}-${String(index + 1).padStart(2, '0')}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    message.success(`${list.length} slides downloaded — post them as one carousel.`);
  };

  /* ------------------------------------------------------------ template gallery */

  const [activeTab, setActiveTab] = useUrlState<StudioTab>('tab', 'create', STUDIO_TABS);
  const galleryOpen = activeTab === 'templates';
  const [galleryThumbs, setGalleryThumbs] = useState<Record<string, string>>({});

  /** Designs for every ready idea and every layout, using the products already chosen. */
  const galleryItems = useMemo(() => [
    ...IDEAS.map((idea) => {
      const text = ideaText(idea, design.lang, products[0]?.name);
      return {
        key: `idea:${idea.id}`, label: `${idea.emoji} ${idea.label}`, idea, template: null as TemplateId | null,
        design: { ...design, template: idea.template, theme: idea.theme, ...text, info: idea.info ?? 'benefits', benefits: [], elements: [] } as StudioDesign,
      };
    }),
    ...TEMPLATES.map((item) => {
      const defaults = templateDefaults(item.id, design.lang);
      const headline = item.id === 'spotlight' && products[0] ? products[0].name : defaults.headline;
      return {
        key: `layout:${item.id}`, label: item.label, idea: null as PostIdea | null, template: item.id,
        design: { ...design, template: item.id, ...defaults, headline, elements: [] } as StudioDesign,
      };
    }),
  ], [design, products]);

  // Draw the thumbnails when the gallery opens (small JPEGs, in the background).
  useEffect(() => {
    if (!galleryOpen) return undefined;
    let cancelled = false;
    (async () => {
      for (const item of galleryItems) {
        if (cancelled) return;
        const limit = TEMPLATES.find((entry) => entry.id === item.design.template)?.maxProducts ?? 1;
        const assets = await loadAssets(item.design, products.slice(0, limit));
        const full = document.createElement('canvas');
        renderDesign(full, item.design, { ...assets, qr: null });
        const thumb = document.createElement('canvas');
        const scale = 240 / Math.max(full.width, full.height);
        thumb.width = Math.round(full.width * scale);
        thumb.height = Math.round(full.height * scale);
        thumb.getContext('2d')?.drawImage(full, 0, 0, thumb.width, thumb.height);
        let url = '';
        try { url = thumb.toDataURL('image/jpeg', 0.75); } catch { url = ''; }
        if (!cancelled) setGalleryThumbs((current) => ({ ...current, [item.key]: url }));
      }
    })();
    return () => { cancelled = true; };
  }, [galleryOpen, galleryItems, loadAssets, products]);

  const pickFromGallery = (item: (typeof galleryItems)[number]) => {
    if (item.idea) applyIdea(item.idea);
    else if (item.template) changeTemplate(item.template);
    setActiveTab('create');
  };

  /** Caption products: every product in the carousel, once. */
  const captionProducts = slides.length
    ? Array.from(new Map(currentSlidesForCaption(slides, activeSlide, products).map((product) => [product.id, product])).values())
    : products;

  /* ------------------------------------------------------------ output */

  const fileName = () => {
    const slug = (design.headline || products[0]?.name || 'post').toLowerCase().replace(/[^a-z0-9а-ш]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40);
    const shop = siteHost().split('.')[0] || 'post';
    return `${shop}-${design.format}-${slug || 'post'}.png`;
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

  /** Transparent, trimmed, full-size PNG of one product (not saved to the shop's photos). */
  const downloadCutout = async (product: StudioProduct) => {
    const photo = await loadImage(product.photos[product.photoIndex]);
    const cut = photo ? getCutout(photo, { tolerance: product.tolerance, erase: product.erase }) : null;
    const blob = cut ? await cutoutPng(cut) : null;
    if (!blob) {
      message.error('Could not make a cut-out of this photo.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product.name.toLowerCase().replace(/[^a-z0-9а-ш]+/gi, '-').replace(/^-|-$/g, '').slice(0, 50) || 'product'}-cutout.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    message.success('Cut-out PNG downloaded');
  };

  /** QR link: what the admin typed, else the first product's page, else the shop. */
  const qrValue = design.qrUrl.trim() || (products[0] ? `${getBrandKit().url}/product/${products[0].id}` : getBrandKit().url);

  const caption = captionEdited ?? buildCaption(design, captionProducts, {
    platform: social.platform,
    tone: social.tone,
    variant: social.variant,
    emojis: social.emojis,
    hashtags,
  });
  const captionTags = countHashtags(caption);
  const firstLine = caption.split('\n')[0] ?? '';
  const facebookCut = previewCut(caption, 'facebook')[1];

  const copyText = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(done);
      return true;
    } catch {
      message.error('Copy failed — select the text and copy it by hand.');
      return false;
    }
  };

  const copyCaption = () => copyText(caption, 'Caption copied');
  const copyHashtags = () => copyText(hashtags.join(' '), 'Hashtags copied — paste them as the first comment');

  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';
  const share = async () => {
    const blob = await canvasBlob();
    if (!blob) return;
    const file = new File([blob], fileName(), { type: 'image/png' });
    if (!navigator.canShare?.({ files: [file] })) {
      message.info('Sharing files isn’t supported in this browser — use Download.');
      return;
    }
    // Instagram ignores text that comes with a shared image, so put the caption
    // on the clipboard first: it can be pasted straight into the post.
    const copied = await copyText(caption, 'Caption copied — paste it in the app after choosing the photo');
    try {
      await navigator.share(copied ? { files: [file] } : { files: [file], text: caption });
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
      products: products.map(({ id, photoIndex, scale, offsetX, offsetY, crop, cutout, tolerance, erase, shadow, rotate, flip, brightness, contrast, saturation }) => ({
        id, photoIndex, scale, offsetX, offsetY, crop, cutout, tolerance, erase, shadow, rotate, flip, brightness, contrast, saturation,
      })),
      social,
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
    setActiveTab('create');
    // Drafts from before the info line showed prices unless the price was off.
    const legacyInfo: InfoMode = draft.design.priceMode === 'none' ? 'none' : 'price';
    setDesign({ ...initialDesign(draft.design.lang), ...draft.design, info: draft.design.info ?? legacyInfo });
    setSocial({ ...initialSocial(), ...(draft.social ?? {}) });
    setCaptionEdited(null);
    setProducts([]);
    const list = await Promise.all(draft.products.map(async (saved) => {
      try {
        const detail = await fetchProduct(saved.id, true).unwrap();
        return {
          ...toStudioProduct(detail),
          photoIndex: saved.photoIndex ?? 0,
          scale: saved.scale ?? 1,
          offsetX: saved.offsetX ?? 0,
          offsetY: saved.offsetY ?? 0,
          crop: saved.crop ?? null,
          cutout: saved.cutout ?? false,
          tolerance: saved.tolerance ?? DEFAULT_CUTOUT.tolerance,
          erase: saved.erase ?? [],
          shadow: saved.shadow ?? true,
          rotate: saved.rotate ?? 0,
          flip: saved.flip ?? false,
          brightness: saved.brightness ?? 100,
          contrast: saved.contrast ?? 100,
          saturation: saved.saturation ?? 100,
        };
      } catch {
        return null;
      }
    }));
    setProducts(list.filter((item): item is StudioProduct => item !== null));
  };

  // Autosave: the post being made is kept in this browser and comes back after a
  // reload (own uploaded photos cannot be kept; products and texts are).
  const AUTOSAVE_KEY = 'postStudio.autosave.v1';
  const restoredRef = useRef(false);
  // While the autosave is being loaded back, don't overwrite it with the
  // half-restored post (its products are still being fetched).
  const restoringRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (searchParams.get('product')) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(AUTOSAVE_KEY) ?? 'null') as Draft | null;
      if (saved?.design) {
        restoringRef.current = true;
        void Promise.resolve(openDraft(saved)).finally(() => { restoringRef.current = false; });
        message.info('Your last post was restored.');
      }
    } catch {
      // nothing saved / storage blocked
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (restoringRef.current) return;
      try {
        const draft: Draft = {
          id: 'autosave', savedAt: new Date().toISOString(), design, social, thumbnail: '',
          products: products.map(({ id, photoIndex, scale, offsetX, offsetY, crop, cutout, tolerance, erase, shadow, rotate, flip, brightness, contrast, saturation }) => ({
            id, photoIndex, scale, offsetX, offsetY, crop, cutout, tolerance, erase, shadow, rotate, flip, brightness, contrast, saturation,
          })),
        };
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
      } catch {
        // storage full or blocked: autosave is a convenience only
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [design, products, social]);

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
    setSocial((current) => ({ ...initialSocial(), platform: current.platform }));
  };

  /* ------------------------------------------------------------ view */

  const priceOptions: { value: PriceMode; label: string }[] = [
    { value: 'retail', label: 'Retail price' },
    { value: 'salon', label: 'Business price' },
    { value: 'custom', label: 'Custom' },
    { value: 'none', label: 'No price' },
  ];

  /** Photo tools for the selected product: background remover, crop, adjust, position, photo. */
  const imagePanel = (() => {
              const image = products.find((item) => item.id === selectedImage);
              if (!image) return null;
              const box = selectionBox;
              const align = (where: 'left' | 'center' | 'right') => {
                if (!box) return;
                const room = (box.spaceW - box.w) / 2 / Math.max(1, box.spaceW);
                adjustProduct(image.id, { offsetX: where === 'left' ? -room : where === 'right' ? room : 0 });
              };
              const moveProduct = (direction: -1 | 1) => setProducts((current) => {
                const list = [...current];
                const index = list.findIndex((item) => item.id === image.id);
                const target = index + direction;
                if (index < 0 || target < 0 || target >= list.length) return current;
                [list[index], list[target]] = [list[target], list[index]];
                return list;
              });
              const slider = (label: string, key: 'brightness' | 'contrast' | 'saturation') => (
                <div className="post-studio__adjust">
                  <Text type="secondary" style={{ fontSize: 12, width: 74 }}>{label}</Text>
                  <Slider min={40} max={160} value={image[key]} onChange={(value) => adjustProduct(image.id, { [key]: value })} style={{ flex: 1, margin: '0 6px' }} />
                </div>
              );
              return (
                <Card
                  size="small"
                  className="post-studio__image-panel"
                  title={<Space><PictureOutlined />Image: <Text ellipsis style={{ maxWidth: 260 }}>{image.name}</Text></Space>}
                  extra={<Button size="small" type="text" onClick={() => setSelectedImage(null)}>Done (Esc)</Button>}
                >
                  <Tabs
                    size="small"
                    items={[
                      {
                        key: 'background',
                        label: 'Background',
                        children: (
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Space size={6}>
                              <Switch size="small" checked={image.cutout} onChange={(checked) => adjustProduct(image.id, { cutout: checked })} />
                              <Text>Remove background</Text>
                            </Space>
                            {image.cutout && (
                              <>
                                <div className="post-studio__adjust">
                                  <Text type="secondary" style={{ fontSize: 12, width: 74 }}>Tolerance</Text>
                                  <Slider key={`${image.id}-${image.tolerance}`} min={0} max={100} defaultValue={image.tolerance} onChangeComplete={(value) => adjustProduct(image.id, { tolerance: value })} style={{ flex: 1, margin: '0 6px' }} />
                                </div>
                                <Space size={6} wrap>
                                  <Button size="small" icon={<HighlightOutlined />} type={erasingId === image.id ? 'primary' : 'default'} onClick={() => setErasingId(erasingId === image.id ? null : image.id)}>
                                    {erasingId === image.id ? 'Erasing: click the preview' : 'Magic eraser'}
                                  </Button>
                                  <Button size="small" icon={<UndoOutlined />} disabled={!image.erase.length} onClick={() => adjustProduct(image.id, { erase: image.erase.slice(0, -1) })}>Undo spot</Button>
                                  <Button size="small" icon={<ClearOutlined />} disabled={!image.erase.length} onClick={() => adjustProduct(image.id, { erase: [] })}>Restore</Button>
                                  <Space size={4}>
                                    <Switch size="small" checked={image.shadow} onChange={(checked) => adjustProduct(image.id, { shadow: checked })} />
                                    <Text style={{ fontSize: 12 }}>Shadow</Text>
                                  </Space>
                                </Space>
                                <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadCutout(image)}>Download cutout PNG</Button>
                              </>
                            )}
                          </Space>
                        ),
                      },
                      {
                        key: 'crop',
                        label: 'Crop',
                        children: (
                          <Space wrap>
                            <Button icon={<ScissorOutlined />} type={image.crop ? 'primary' : 'default'} onClick={() => setCropping(image.id)}>{image.crop ? 'Change crop' : 'Crop photo'}</Button>
                            <Button disabled={!image.crop} onClick={() => adjustProduct(image.id, { crop: null })}>Remove crop</Button>
                          </Space>
                        ),
                      },
                      {
                        key: 'adjust',
                        label: 'Adjust',
                        children: (
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <div className="post-studio__adjust">
                              <Text type="secondary" style={{ fontSize: 12, width: 74 }}>Size</Text>
                              <Slider min={20} max={300} value={Math.round(image.scale * 100)} onChange={(value) => adjustProduct(image.id, { scale: value / 100 })} style={{ flex: 1, margin: '0 6px' }} />
                            </div>
                            <div className="post-studio__adjust">
                              <Text type="secondary" style={{ fontSize: 12, width: 74 }}>Rotate</Text>
                              <Slider min={-180} max={180} value={image.rotate} onChange={(value) => adjustProduct(image.id, { rotate: value })} style={{ flex: 1, margin: '0 6px' }} />
                            </div>
                            {slider('Brightness', 'brightness')}
                            {slider('Contrast', 'contrast')}
                            {slider('Saturation', 'saturation')}
                            <Space size={6} wrap>
                              <Button size="small" icon={<SwapOutlined />} onClick={() => adjustProduct(image.id, { flip: !image.flip })}>Flip</Button>
                              <Button size="small" onClick={() => adjustProduct(image.id, { rotate: 0, flip: false, brightness: 100, contrast: 100, saturation: 100 })}>Reset adjustments</Button>
                            </Space>
                          </Space>
                        ),
                      },
                      {
                        key: 'position',
                        label: 'Position',
                        children: (
                          <Space size={6} wrap>
                            <Button size="small" onClick={() => align('left')}>Left</Button>
                            <Button size="small" onClick={() => align('center')}>Centre</Button>
                            <Button size="small" onClick={() => align('right')}>Right</Button>
                            <Button size="small" icon={<ArrowUpOutlined />} disabled={products.length < 2} onClick={() => moveProduct(1)}>Forward</Button>
                            <Button size="small" icon={<ArrowDownOutlined />} disabled={products.length < 2} onClick={() => moveProduct(-1)}>Back</Button>
                            <Button size="small" icon={<UndoOutlined />} onClick={() => adjustProduct(image.id, { ...DEFAULT_ADJUST })}>Reset</Button>
                          </Space>
                        ),
                      },
                      {
                        key: 'photo',
                        label: `Photo (${image.photos.length})`,
                        children: (
                          <div className="post-studio__photo-pick">
                            {image.photos.map((url, index) => (
                              <button
                                key={url}
                                type="button"
                                className={index === image.photoIndex ? 'is-active' : ''}
                                onClick={() => adjustProduct(image.id, { photoIndex: index, crop: null, erase: [] })}
                                aria-label={`Use photo ${index + 1}`}
                              >
                                <img src={url} alt="" />
                              </button>
                            ))}
                          </div>
                        ),
                      },
                    ]}
                  />
                </Card>
              );
  })();

  const captionCard = (
            <Card
              size="small"
              title={`Caption for ${social.platform === 'instagram' ? 'Instagram' : 'Facebook'}`}
              extra={(
                <Space size={6} wrap>
                  {captionEdited !== null && <Button size="small" type="link" onClick={() => setCaptionEdited(null)}>Rebuild</Button>}
                  <Button size="small" icon={<CopyOutlined />} onClick={copyHashtags} disabled={!hashtags.length}>Hashtags</Button>
                  <Button size="small" type="primary" icon={<CopyOutlined />} onClick={copyCaption}>Copy caption</Button>
                </Space>
              )}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <div className="post-studio__caption-tools">
                  <Segmented size="small" value={social.tone} onChange={(value) => changeSocial({ tone: value as Tone, variant: 0 })} options={TONES} />
                  <Tooltip title="Same facts, different first line">
                    <Button size="small" icon={<SyncOutlined />} onClick={() => changeSocial({ variant: social.variant + 1 })}>New wording</Button>
                  </Tooltip>
                  <Space size={6}>
                    <Switch size="small" checked={social.emojis} onChange={(checked) => changeSocial({ emojis: checked })} />
                    <Text style={{ fontSize: 13 }}>Emojis</Text>
                  </Space>
                </div>

                <TextArea
                  value={caption}
                  onChange={(event) => setCaptionEdited(event.target.value)}
                  autoSize={{ minRows: 5, maxRows: 14 }}
                  aria-label="Caption"
                />
                {captionEdited !== null && (
                  <Text type="secondary" style={{ fontSize: 12 }}>Your edits are kept. “Rebuild” writes it again from the design.</Text>
                )}

                <div className="post-studio__counters">
                  {social.platform === 'instagram' ? (
                    <>
                      <Tag color={caption.length > INSTAGRAM_LIMITS.characters ? 'red' : 'default'}>
                        {caption.length.toLocaleString('en-US')} / {INSTAGRAM_LIMITS.characters.toLocaleString('en-US')} characters
                      </Tag>
                      <Tag color={captionTags > INSTAGRAM_LIMITS.hashtags ? 'red' : 'default'}>
                        {captionTags} / {INSTAGRAM_LIMITS.hashtags} hashtags
                      </Tag>
                      <Tag color={firstLine.length > INSTAGRAM_LIMITS.preview ? 'orange' : 'green'}>
                        First line {firstLine.length > INSTAGRAM_LIMITS.preview ? 'is cut before “more”' : 'fits before “more”'}
                      </Tag>
                    </>
                  ) : (
                    <>
                      <Tag>{caption.length.toLocaleString('en-US')} characters</Tag>
                      <Tag color={facebookCut ? 'orange' : 'green'}>
                        {facebookCut ? 'Long: Facebook shows “See more”' : 'Fits without “See more”'}
                      </Tag>
                      <Tag color={captionTags > 3 ? 'orange' : 'default'}>{captionTags} hashtags (2–3 work best)</Tag>
                    </>
                  )}
                </div>

                <div>
                  <Text strong className="post-studio__label">Hashtags</Text>
                  <div className="post-studio__tags">
                    {hashtags.map((tag) => (
                      <Tag key={tag} closable color="magenta" onClose={(event) => { event.preventDefault(); setHashtags(hashtags.filter((item) => item !== tag)); }}>
                        {tag}
                      </Tag>
                    ))}
                    <Space.Compact size="small">
                      <Input
                        size="small"
                        value={newTag}
                        onChange={(event) => setNewTag(event.target.value)}
                        onPressEnter={addTag}
                        placeholder="#add"
                        style={{ width: 120 }}
                        aria-label="Add a hashtag"
                      />
                      <Button size="small" icon={<PlusOutlined />} onClick={addTag} aria-label="Add hashtag" />
                    </Space.Compact>
                  </div>
                  {moreTags.length > 0 && (
                    <div className="post-studio__tags post-studio__tags--suggested">
                      <Text type="secondary" style={{ fontSize: 12 }}>Suggested:</Text>
                      {moreTags.slice(0, 16).map((tag) => (
                        <Tag key={tag} className="post-studio__tag-add" onClick={() => setHashtags([...hashtags, tag])}>+ {tag}</Tag>
                      ))}
                    </div>
                  )}
                  {social.platform === 'instagram' && (
                    <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 12 }}>
                      Tip: copy the hashtags separately and paste them as the first comment for a cleaner caption.
                    </Paragraph>
                  )}
                </div>
              </Space>
            </Card>
  );

  return (
    <div className="post-studio">
      <div className="post-studio__head">
        <div>
          <Title level={2} style={{ margin: 0 }}>Post Studio</Title>
          <Text type="secondary">Ready Instagram & Facebook posts from your products: pick an idea, check the feed preview, download the image and copy the caption.</Text>
        </div>
        <Space wrap>
          <Tooltip title="Undo (Ctrl+Z)"><Button icon={<UndoOutlined />} disabled={!historyCount.undo} onClick={undo} aria-label="Undo" /></Tooltip>
          <Tooltip title="Redo (Ctrl+Shift+Z)"><Button icon={<RedoOutlined />} disabled={!historyCount.redo} onClick={redo} aria-label="Redo" /></Tooltip>
          <Button icon={<ReloadOutlined />} onClick={reset}>Start over</Button>
          <Button icon={<SaveOutlined />} onClick={saveDraft}>Save draft</Button>
          <Button icon={<QuestionCircleOutlined />} onClick={() => setActiveTab('help')}>How to use</Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => { if (key === 'templates') setGalleryThumbs({}); setActiveTab(key as StudioTab); }}
        className="post-studio__tabs"
        items={[
          {
            key: 'create',
            label: <span><EditOutlined /> Create</span>,
            children: (
      <>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10} xl={7} className="post-studio__side">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card
              size="small"
              title={<Space><BulbOutlined />Ready post ideas</Space>}
              extra={<Button size="small" icon={<AppstoreOutlined />} onClick={() => { setGalleryThumbs({}); setActiveTab('templates'); }}>Template gallery</Button>}
            >
              {coming.length > 0 && (
                <div className="post-studio__coming">
                  <Text strong className="post-studio__label">Coming up</Text>
                  <div className="post-studio__ideas">
                    {coming.map(({ idea, inDays, date }) => (
                      <button
                        key={idea.id}
                        type="button"
                        className={`post-studio__idea post-studio__idea--soon${social.ideaId === idea.id ? ' is-active' : ''}`}
                        onClick={() => applyIdea(idea)}
                      >
                        <span className="post-studio__idea-emoji">{idea.emoji}</span>
                        <strong>{idea.label}</strong>
                        <small>{inDays === 0 ? 'Today' : `in ${inDays} day${inDays === 1 ? '' : 's'}`} · {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Segmented size="small" block value={ideaGroup} onChange={(value) => setIdeaGroup(value as IdeaGroup | 'all')} options={IDEA_GROUPS} style={{ margin: '4px 0 10px' }} />
              <div className="post-studio__ideas">
                {visibleIdeas.map((idea) => (
                  <button
                    key={idea.id}
                    type="button"
                    className={`post-studio__idea${social.ideaId === idea.id ? ' is-active' : ''}`}
                    onClick={() => applyIdea(idea)}
                    title={idea.hint}
                  >
                    <span className="post-studio__idea-emoji">{idea.emoji}</span>
                    <strong>{idea.label}</strong>
                    <small>{idea.hint}</small>
                  </button>
                ))}
              </div>
            </Card>

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
                  {design.template === 'beforeAfter' && (
                    <Space wrap style={{ marginTop: 8 }}>
                      {(['before', 'after'] as const).map((slot) => (
                        <Upload
                          key={slot}
                          accept="image/*"
                          showUploadList={false}
                          beforeUpload={(file) => {
                            const old = beforeAfterUrls[slot];
                            if (old) URL.revokeObjectURL(old);
                            setBeforeAfterUrls((current) => ({ ...current, [slot]: URL.createObjectURL(file) }));
                            return false;
                          }}
                        >
                          <Button size="small" icon={<UploadOutlined />}>{beforeAfterUrls[slot] ? `Change ${slot} photo` : `${slot === 'before' ? 'Before' : 'After'} photo`}</Button>
                        </Upload>
                      ))}
                      <Text type="secondary" style={{ fontSize: 12 }}>Without photos, the first two products are used.</Text>
                    </Space>
                  )}
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
                    A shop, shelf or team photo from your phone. It stays on this computer; nothing is uploaded.
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
                <Paragraph type="secondary" style={{ margin: '8px 0 0', fontSize: 12 }}>
                  On the preview: click a product to select it, drag to move, Shift + drag (or mouse wheel / pinch) to resize, double-click for the photo tools.
                </Paragraph>
              )}
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
                          {product.stylistPrice > 0 ? ` · business ${formatPrice(product.stylistPrice)}` : ''}
                        </Text>
                      </div>
                      <Tooltip title={product.photos.length > 1 ? `Use another photo (${product.photoIndex + 1}/${product.photos.length})` : 'Only one photo'}>
                        <Button size="small" icon={<SwapOutlined />} disabled={product.photos.length < 2} onClick={() => nextPhoto(product.id)}>
                          {product.photoIndex + 1}/{Math.max(1, product.photos.length)}
                        </Button>
                      </Tooltip>
                      <Space size={4} wrap>
                        <Tooltip title="Background remover, crop, size, colours and position (or double-click the photo on the preview)">
                          <Button size="small" type={selectedImage === product.id ? 'primary' : 'default'} icon={<ScissorOutlined />} disabled={!product.photos.length} onClick={() => { const open = selectedImage !== product.id || !toolsOpen; setSelectedImage(open ? product.id : null); setToolsOpen(open); }}>
                            Edit photo
                          </Button>
                        </Tooltip>
                        {product.cutout && <Tag color="purple" style={{ margin: 0 }}>No background</Tag>}
                        {product.crop && <Tag style={{ margin: 0 }}>Cropped</Tag>}
                      </Space>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <Text strong className="post-studio__label">What the image shows under the product</Text>
                <Select
                  value={design.info}
                  onChange={(value: InfoMode) => update('info', value)}
                  options={INFO_OPTIONS}
                  style={{ width: '100%' }}
                />
                {design.info === 'benefits' && (
                  <Select
                    mode="tags"
                    style={{ width: '100%', marginTop: 8 }}
                    value={design.benefits.length ? design.benefits : (products[0] ? suggestBenefits(products[0].description || products[0].name, design.lang) : [])}
                    onChange={(value: string[]) => update('benefits', value.slice(0, 3))}
                    options={benefitChoices(design.lang).map((item) => ({ value: item, label: item }))}
                    placeholder="Pick or type up to 3 benefits"
                    maxCount={3}
                  />
                )}
                {design.info === 'size' && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                    Read from the product name{products[0] ? `: ${productSize(products[0].name) || 'no size in the name'}` : ''}.
                  </Text>
                )}
                {design.info === 'promo' && (
                  <Input style={{ marginTop: 8 }} value={design.promoCode} onChange={(event) => update('promoCode', event.target.value)} placeholder="e.g. SPRING10" addonBefore="Code" maxLength={24} />
                )}
                {design.info === 'cta' && (
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={design.ctaText}
                    onChange={(value: string) => update('ctaText', value)}
                    options={ctaChoices(design.lang).map((item) => ({ value: item, label: item }))}
                    showSearch
                    onSearch={(value) => { if (value) update('ctaText', value); }}
                  />
                )}
                {design.info === 'badge' && (
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={design.badgeText}
                    onChange={(value: string) => update('badgeText', value)}
                    options={badgeChoices(design.lang).map((item) => ({ value: item, label: item }))}
                  />
                )}
                {design.info === 'price' && (
                  <>
                    <Segmented block size="small" style={{ marginTop: 8 }} value={design.priceMode} onChange={(value) => update('priceMode', value as PriceMode)} options={priceOptions.filter((option) => option.value !== 'none')} />
                    {design.priceMode === 'custom' && (
                      <Input style={{ marginTop: 8 }} value={design.customPrice} onChange={(event) => update('customPrice', event.target.value)} placeholder="e.g. 790 MKD" />
                    )}
                    <Input
                      style={{ marginTop: 8 }}
                      value={design.oldPrice}
                      onChange={(event) => update('oldPrice', event.target.value)}
                      placeholder="Old price, shown crossed out (optional)"
                      addonBefore="Was"
                    />
                  </>
                )}
              </div>
            </Card>

            <Card size="small" title="3 · Text">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Segmented block value={design.lang} onChange={(value) => changeLang(value as StudioLang)} options={LANGS} />
                <Input addonBefore="Small title" value={design.eyebrow} onChange={(event) => update('eyebrow', event.target.value)} maxLength={40} />
                <TextArea value={design.headline} onChange={(event) => update('headline', event.target.value)} placeholder="Headline" autoSize={{ minRows: 1, maxRows: 3 }} maxLength={90} showCount />
                <TextArea value={design.subline} onChange={(event) => update('subline', event.target.value)} placeholder={design.template === 'steps' ? 'Steps, one per line (up to 5)' : design.template === 'review' ? 'Customer name' : 'Second line (optional)'} autoSize={{ minRows: design.template === 'steps' ? 3 : 1, maxRows: 6 }} maxLength={design.template === 'steps' ? 400 : 160} />
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
                <Input addonBefore="Bottom text" value={design.cta} onChange={(event) => update('cta', event.target.value)} placeholder={siteHost()} maxLength={40} />
                <Space>
                  <Switch checked={design.showLogo} onChange={(checked) => update('showLogo', checked)} />
                  <Text>Show logo</Text>
                </Space>
                <Space wrap>
                  <Switch checked={design.qr} onChange={(checked) => update('qr', checked)} />
                  <Text>QR code</Text>
                  {design.qr && (
                    <Input size="small" value={design.qrUrl} onChange={(event) => update('qrUrl', event.target.value)} placeholder={qrValue} style={{ width: 240 }} aria-label="QR code link" />
                  )}
                </Space>
                {/* Hidden: the free QR library draws here, the post copies it. */}
                <div ref={qrRef} style={{ display: 'none' }} aria-hidden>
                  {design.qr && <QRCodeCanvas value={qrValue} size={512} level="M" marginSize={1} />}
                </div>
              </Space>
            </Card>

            <Card size="small" title={<Space><FontSizeOutlined />4 · Text, stickers & shapes</Space>}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space wrap size={6}>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => addElement(makeElement('text', { text: design.headline || 'Your text', y: 0.2 }))}>Text</Button>
                  {SHAPES.map((shape) => (
                    <Button key={shape.value} size="small" onClick={() => addElement(makeElement('shape', { shape: shape.value as ShapeKind, y: 0.3 }))}>{shape.label}</Button>
                  ))}
                </Space>
                <div className="post-studio__emojis">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => addElement(makeElement('emoji', { text: emoji, x: 0.8, y: 0.2 }))} aria-label={`Add ${emoji} sticker`}>{emoji}</button>
                  ))}
                </div>
                {elements.length > 0 && (
                  <div className="post-studio__layers">
                    {[...elements].reverse().map((item) => (
                      <div key={item.id} className={`post-studio__layer${item.id === selectedEl ? ' is-active' : ''}`}>
                        <button type="button" className="post-studio__layer-name" onClick={() => setSelectedEl(item.id)}>{elementLabel(item)}</button>
                        <Tooltip title="Bring forward"><Button size="small" type="text" icon={<ArrowUpOutlined />} onClick={() => moveLayer(item.id, 1)} aria-label="Bring forward" /></Tooltip>
                        <Tooltip title="Send back"><Button size="small" type="text" icon={<ArrowDownOutlined />} onClick={() => moveLayer(item.id, -1)} aria-label="Send back" /></Tooltip>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeElement(item.id)} aria-label="Delete" />
                      </div>
                    ))}
                  </div>
                )}
                {selectedElement && (
                  <div className="post-studio__element-editor">
                    {selectedElement.kind !== 'emoji' && (selectedElement.kind === 'text' || ['ribbon', 'burst', 'circle'].includes(selectedElement.shape ?? '')) && (
                      <TextArea
                        value={selectedElement.text}
                        onChange={(event) => updateElement(selectedElement.id, { text: event.target.value })}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        maxLength={120}
                        aria-label="Item text"
                      />
                    )}
                    <div className="post-studio__adjust">
                      <Text type="secondary" style={{ fontSize: 12, width: 34 }}>Size</Text>
                      <Slider min={2} max={100} value={Math.round(selectedElement.size * 100)} onChange={(value) => updateElement(selectedElement.id, { size: value / 100 })} style={{ flex: 1, margin: '0 6px' }} />
                    </div>
                    <Space wrap size={8}>
                      {selectedElement.kind !== 'emoji' && (
                        <label className="post-studio__colour">
                          <input type="color" value={selectedElement.color} onChange={(event) => updateElement(selectedElement.id, { color: event.target.value })} />
                          <span>{selectedElement.kind === 'text' ? 'Colour' : 'Fill'}</span>
                        </label>
                      )}
                      {selectedElement.kind === 'shape' && selectedElement.text && (
                        <label className="post-studio__colour">
                          <input type="color" value={selectedElement.ink} onChange={(event) => updateElement(selectedElement.id, { ink: event.target.value })} />
                          <span>Text</span>
                        </label>
                      )}
                      {selectedElement.kind !== 'emoji' && (
                        <Segmented size="small" value={selectedElement.font} onChange={(value) => updateElement(selectedElement.id, { font: value as 'serif' | 'sans' })} options={[{ value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Sans' }]} />
                      )}
                      {selectedElement.kind === 'text' && (
                        <Segmented size="small" value={selectedElement.align} onChange={(value) => updateElement(selectedElement.id, { align: value as StudioElement['align'] })} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }]} />
                      )}
                      {selectedElement.kind !== 'emoji' && (
                        <Space size={4}>
                          <Switch size="small" checked={selectedElement.bold} onChange={(checked) => updateElement(selectedElement.id, { bold: checked })} />
                          <Text style={{ fontSize: 12 }}>Bold</Text>
                        </Space>
                      )}
                    </Space>
                  </div>
                )}
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                  Drag items on the preview · Shift + drag to resize · Delete key removes the selected item · Ctrl+Z undo, Ctrl+Shift+Z redo.
                </Paragraph>
              </Space>
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={14} xl={10}>
          <div className="post-studio__preview-wrap">
            <Card
              size="small"
              className="post-studio__preview-card"
              title={(
                <Segmented
                  value={social.platform}
                  onChange={(value) => setPlatform(value as Platform)}
                  options={[
                    { value: 'instagram', label: <Space size={6}><InstagramOutlined />Instagram</Space> },
                    { value: 'facebook', label: <Space size={6}><FacebookFilled />Facebook</Space> },
                  ]}
                />
              )}
              extra={(
                <Space size={6} wrap className="post-studio__profile">
                  {social.platform === 'instagram' ? (
                    <Input size="small" prefix="@" value={profile.handle} onChange={(event) => updateProfile({ handle: event.target.value })} placeholder="handle" style={{ width: 150 }} aria-label="Instagram handle shown in the preview" />
                  ) : (
                    <Input size="small" value={profile.pageName} onChange={(event) => updateProfile({ pageName: event.target.value })} placeholder="Page name" style={{ width: 170 }} aria-label="Facebook page name shown in the preview" />
                  )}
                </Space>
              )}
            >
              <div className="post-studio__preview">
                <PostMockup platform={social.platform} format={design.format} handle={profile.handle} pageName={profile.pageName} caption={caption}>
                <div className="post-studio__canvas-wrap">
                <canvas
                  ref={canvasRef}
                  className={`${rendering ? 'is-rendering' : ''}${hovering ? ' is-over-photo' : ''}${erasingId ? ' is-erasing' : ''}`}
                  onPointerDown={onCanvasPointerDown}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={onCanvasPointerUp}
                  onPointerCancel={onCanvasPointerUp}
                  onPointerLeave={() => { if (!pointer.current) setHovering(false); }}
                  onDoubleClick={() => { if (selectedImage) setToolsOpen(true); }}
                  style={{ aspectRatio: `${format.width} / ${format.height}` }}
                  aria-label="Post preview"
                />
                {selectionBox && (
                  <span
                    className="post-studio__selection"
                    style={{
                      left: `${(selectionBox.x / format.width) * 100}%`,
                      top: `${(selectionBox.y / format.height) * 100}%`,
                      width: `${(selectionBox.w / format.width) * 100}%`,
                      height: `${(selectionBox.h / format.height) * 100}%`,
                    }}
                  />
                )}
                </div>
                </PostMockup>
              </div>
              <div className="post-studio__slides">
                {slides.length > 0 && slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`post-studio__slide${index === activeSlide ? ' is-active' : ''}`}
                    onClick={() => { if (index !== activeSlide) openSlide(currentSlides(), index); }}
                    title={`Slide ${index + 1}`}
                  >
                    {index !== activeSlide && slide.thumbnail ? <img src={slide.thumbnail} alt="" /> : <span>{index + 1}</span>}
                  </button>
                ))}
                <Space size={4} wrap>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => addSlide(false)}>{slides.length ? 'Slide' : 'Make a carousel'}</Button>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => addSlide(true)}>Duplicate</Button>
                  {slides.length > 0 && (
                    <>
                      <Button size="small" icon={<ArrowUpOutlined style={{ transform: 'rotate(-90deg)' }} />} disabled={activeSlide === 0} onClick={() => moveSlide(-1)} aria-label="Move slide left" />
                      <Button size="small" icon={<ArrowDownOutlined style={{ transform: 'rotate(-90deg)' }} />} disabled={activeSlide === slides.length - 1} onClick={() => moveSlide(1)} aria-label="Move slide right" />
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={deleteSlide} aria-label="Delete slide" />
                    </>
                  )}
                </Space>
              </div>
              <div className="post-studio__actions">
                <Text type="secondary">{format.width} × {format.height} px · {format.hint}{slides.length ? ` · slide ${activeSlide + 1} of ${slides.length}` : ''}</Text>
                <Space wrap>
                  {canShareFiles && <Button icon={<ShareAltOutlined />} onClick={share}>Share</Button>}
                  {slides.length > 0 && <Button icon={<DownloadOutlined />} onClick={exportSlides}>All {slides.length} slides</Button>}
                  <Button type="primary" icon={<DownloadOutlined />} onClick={download}>{slides.length ? 'This slide' : 'Download PNG'}</Button>
                </Space>
              </div>
            </Card>




            {!wide && captionCard}
          </div>
        </Col>
        {wide && (
          <Col xl={7} className="post-studio__side">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {imagePanel ?? (
                <Card size="small" title={<Space><PictureOutlined />Photo tools</Space>}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {products.length ? 'Click a product photo on the preview (or “Edit photo” in the list) to remove its background, crop, resize or adjust it.' : 'Pick products on the left; their photo tools appear here.'}
                  </Text>
                </Card>
              )}
              {captionCard}
            </Space>
          </Col>
        )}
      </Row>
      {!wide && (
        <Drawer
          open={!!imagePanel && toolsOpen}
          onClose={() => setToolsOpen(false)}
          placement={screens.md ? 'right' : 'bottom'}
          size={screens.md ? 400 : '70vh'}
          mask={false}
          title={null}
          closable={false}
          styles={{ body: { padding: 12 } }}
        >
          {imagePanel}
        </Drawer>
      )}
      </>
            ),
          },
          {
            key: 'templates',
            label: <span><AppstoreOutlined /> Templates</span>,
            children: (
              <div>
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Previews use your chosen products{products.length ? '' : ' (pick products first to see them here)'}, language and size.
        </Paragraph>
        <div className="post-studio__gallery">
          {galleryItems.map((item) => (
            <button key={item.key} type="button" className="post-studio__gallery-item" onClick={() => pickFromGallery(item)}>
              <span className="post-studio__gallery-thumb" style={{ aspectRatio: `${format.width} / ${format.height}` }}>
                {galleryThumbs[item.key] ? <img src={galleryThumbs[item.key]} alt="" /> : <span className="post-studio__gallery-wait">…</span>}
              </span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
              </div>
            ),
          },
          {
            key: 'canvas',
            label: <span><BgColorsOutlined /> Canvas (free editing)</span>,
            children: (
              <Suspense fallback={<Spin style={{ display: 'block', margin: '80px auto' }} />}>
                <CanvasEditor
                  active={activeTab === 'canvas'}
                  frames={CANVAS_FRAMES}
                  productPhotos={products.flatMap((product) => (product.photos[product.photoIndex] ? [{ name: product.name, src: product.photos[product.photoIndex] }] : []))}
                  onImportPost={async () => {
                    const [{ docFromPost }, assets] = await Promise.all([import('@/features/studio/canvas/fromPost'), loadAssets(design, products)]);
                    const qr = design.qr ? qrRef.current?.querySelector('canvas') ?? null : null;
                    return docFromPost(design, { ...assets, qr });
                  }}
                />
              </Suspense>
            ),
          },
          {
            key: 'drafts',
            label: <span><FolderOpenOutlined /> Drafts ({drafts.length})</span>,
            children: (
            <Card size="small" title={`Saved in this browser (${drafts.length})`}>
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
            ),
          },
          {
            key: 'help',
            label: <span><QuestionCircleOutlined /> How to use</span>,
            children: <StudioHelp />,
          },
        ]}
      />
      <CropModal
        open={cropping !== null}
        imageUrl={(() => {
          const product = products.find((item) => item.id === cropping);
          return product ? product.photos[product.photoIndex] ?? null : null;
        })()}
        initial={products.find((item) => item.id === cropping)?.crop ?? null}
        onCancel={() => setCropping(null)}
        onApply={(crop) => {
          if (cropping) adjustProduct(cropping, { crop, scale: 1, offsetX: 0, offsetY: 0 });
          setCropping(null);
        }}
      />
    </div>
  );
}

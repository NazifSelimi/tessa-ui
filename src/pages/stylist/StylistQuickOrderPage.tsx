/**
 * Stylist Quick Order Page
 *
 * Route: /stylist/quick-order
 *
 * Optimised for speed and simplicity (Phase 3 + Phase 4 UX guidelines):
 * - Large search input (debounced 300 ms, cancels previous request)
 * - Large table with oversized fonts, high-contrast rows
 * - Quantity +/– with big tap-targets
 * - Enter key adds to cart
 * - Sticky cart summary panel at the bottom
 * - No hover-only interactions; clear visual feedback
 * - Pagination
 *
 * Uses RTK Query lazy query so we can cancel & re-trigger on search change.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Input,
  Button,
  Table,
  InputNumber,
  Space,
  Tag,
  Badge,
  message,
  Pagination,
  Empty,
  Spin,
  Grid,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  ShoppingCartOutlined,
  CheckCircleFilled,
  DeleteOutlined,
} from '@ant-design/icons';
import { useLazyGetQuickOrderProductsQuery } from '@/features/quickorder/api';
import { useCart } from '@/hooks/useCart';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { QuickOrderItem } from '@/types';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const PER_PAGE = 25;

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="%23f3f3f3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="sans-serif" font-size="10">No img</text></svg>';

/* ------------------------------------------------------------------ */
/*  Quantity Input                                                     */
/* ------------------------------------------------------------------ */

interface QtyInputProps {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  onEnter: () => void;
}

function QtyInput({ value, onChange, max, onEnter }: QtyInputProps) {
  return (
    <Space size={4}>
      <Button
        icon={<MinusOutlined />}
        size="large"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Decrease quantity"
        style={{ width: 44, height: 44, fontSize: 18 }}
      />
      <InputNumber
        min={1}
        max={max}
        value={value}
        onChange={(v) => onChange(v ?? 1)}
        onPressEnter={onEnter}
        controls={false}
        style={{ width: 60, height: 44, fontSize: 18, textAlign: 'center' }}
        aria-label="Quantity"
      />
      <Button
        icon={<PlusOutlined />}
        size="large"
        disabled={max != null && value >= max}
        onClick={() => onChange(Math.min(value + 1, max ?? Infinity))}
        aria-label="Increase quantity"
        style={{ width: 44, height: 44, fontSize: 18 }}
      />
    </Space>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function StylistQuickOrderPage() {
  const navigate = useNavigate();
  const { addItem, items: cartItems, itemCount, subtotal } = useCart();

  // Search & pagination state
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  // Per-row quantity tracker (product id → qty)
  const [quantities, setQuantities] = useState<Record<string | number, number>>({});

  // RTK Query lazy query (allows cancel)
  const [trigger, { data, isFetching, error }] = useLazyGetQuickOrderProductsQuery();
  const abortRef = useRef<ReturnType<typeof trigger> | null>(null);

  // Flash feedback: recently-added product ids
  const [flashIds, setFlashIds] = useState<Set<string | number>>(new Set());

  // Track previous search to detect search-change vs page-change
  const prevSearchRef = useRef(debouncedSearch);

  /* ----- fetch on search/page change (single effect to avoid double-fetch) ----- */
  useEffect(() => {
    const searchChanged = prevSearchRef.current !== debouncedSearch;
    prevSearchRef.current = debouncedSearch;

    // When search changes and we're not on page 1, reset page first.
    // The setPage(1) will re-trigger this effect with page=1.
    if (searchChanged && page !== 1) {
      setPage(1);
      return;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = trigger({
      page,
      perPage: PER_PAGE,
      search: debouncedSearch || undefined,
    });
  }, [debouncedSearch, page, trigger]);

  /* ----- helpers ----- */
  const getQty = (id: string | number) => quantities[id] ?? 1;

  const setQty = (id: string | number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const handleAdd = useCallback(
    (product: QuickOrderItem) => {
      const qty = quantities[product.id] ?? 1;
      // Always provide stylistPrice for cart logic (fallback to price if missing)
      addItem(
        {
          id: product.id,
          name: product.name,
          brand: null,
          category: null,
          description: '',
          price: product.price,
          stylistPrice: product.stylistPrice,
          image: product.thumbnail,
          inStock: product.stock > 0,
          quantity: product.stock,
        },
        qty,
      );
      message.success({
        content: `${qty}× ${product.name} added`,
        duration: 1.5,
      });

      // Flash green on the row briefly
      setFlashIds((prev) => new Set(prev).add(product.id));
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }, 1200);

      // Reset qty back to 1
      setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    },
    [addItem, quantities],
  );
  

  /* ----- table columns (desktop) ----- */
  const columns = [
    {
      title: '',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 70,
      render: (thumb: string | null) => (
        <img
          src={thumb || PLACEHOLDER_IMG}
          alt=""
          style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, display: 'block' }}
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
        />
      ),
    },
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Text strong style={{ fontSize: 16 }}>{name}</Text>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (_: unknown, product: QuickOrderItem) => (
        <Text strong style={{ fontSize: 16 }}>
          {formatPrice(product.stylistPrice)}
        </Text>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      width: 90,
      render: (stock: number) =>
        stock > 0 ? (
          <Tag color="green" style={{ fontSize: 14, padding: '4px 10px' }}>
            {stock}
          </Tag>
        ) : (
          <Tag color="red" style={{ fontSize: 14, padding: '4px 10px' }}>
            Out
          </Tag>
        ),
    },
    {
      title: 'Qty',
      key: 'qty',
      width: 180,
      render: (_: unknown, record: QuickOrderItem) => (
        <QtyInput
          value={getQty(record.id)}
          onChange={(v) => setQty(record.id, v)}
          max={record.stock > 0 ? record.stock : undefined}
          onEnter={() => record.stock > 0 && handleAdd(record)}
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 120,
      render: (_: unknown, record: QuickOrderItem) => (
        <Button
          type="primary"
          size="large"
          icon={
            flashIds.has(record.id)
              ? <CheckCircleFilled />
              : <ShoppingCartOutlined />
          }
          disabled={record.stock <= 0}
          onClick={() => handleAdd(record)}
          style={{
            minWidth: 100,
            height: 44,
            fontSize: 15,
            ...(flashIds.has(record.id)
              ? { background: '#52c41a', borderColor: '#52c41a' }
              : {}),
          }}
        >
          {flashIds.has(record.id) ? 'Added!' : 'Add'}
        </Button>
      ),
    },
  ];

  /* ----- render ----- */
  const products = data?.data ?? [];
  const meta = data?.meta;
  const hasError = !!error;
  const screens = useBreakpoint();
  const isMobile = !screens.md; // below 768px

  return (
    <div style={{ paddingBottom: 120 /* room for sticky bar */ }}>
      {/* Header */}
      <div style={{
        padding: '24px 24px 0',
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        <Title level={2} style={{ marginBottom: 8 }}>Quick Order</Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Search, set quantity, and press <strong>Enter</strong> or click <strong>Add</strong>. Your
          cart updates instantly.
        </Text>
      </div>

      {/* Search */}
      <div style={{
        padding: '20px 24px',
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        <Input
          size="large"
          placeholder="Search products by name or brand…"
          prefix={<SearchOutlined style={{ fontSize: 20 }} />}
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 18, height: 56 }}
          autoFocus
        />
      </div>

      {/* Product list */}
      <div style={{
        padding: '0 24px 24px',
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        {hasError ? (
          <Empty
            description="Failed to load products. Please try again."
            style={{ padding: 60 }}
          />
        ) : (
          <Spin spinning={isFetching} tip="Loading…">
            {isMobile ? (
              /* ========== MOBILE CARD LAYOUT ========== */
              products.length === 0 && !isFetching ? (
                <Empty description="No products found." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {products.map((product) => {
                    const isFlash = flashIds.has(product.id);
                    return (
                      <div
                        key={product.id}
                        style={{
                          display: 'flex',
                          gap: 12,
                          padding: 12,
                          background: isFlash ? '#f6ffed' : '#fff',
                          borderRadius: 10,
                          border: '1px solid #f0f0f0',
                          transition: 'background 0.3s ease',
                        }}
                      >
                        {/* Thumbnail */}
                        <img
                          src={product.thumbnail || PLACEHOLDER_IMG}
                          alt={product.name}
                          style={{
                            width: 72,
                            height: 72,
                            objectFit: 'cover',
                            borderRadius: 8,
                            flexShrink: 0,
                          }}
                          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                        />

                        {/* Info + Actions */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Name + Price row */}
                          <Text strong style={{ fontSize: 15, display: 'block', lineHeight: 1.3 }} ellipsis>
                            {product.name}
                          </Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Text strong style={{ fontSize: 15 }}>
                              {formatPrice(product.stylistPrice)}
                            </Text>
                            {product.stock > 0 ? (
                              <Tag color="green" style={{ margin: 0 }}>{product.stock} in stock</Tag>
                            ) : (
                              <Tag color="red" style={{ margin: 0 }}>Out</Tag>
                            )}
                          </div>

                          {/* Qty + Add row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <QtyInput
                              value={getQty(product.id)}
                              onChange={(v) => setQty(product.id, v)}
                              max={product.stock > 0 ? product.stock : undefined}
                              onEnter={() => product.stock > 0 && handleAdd(product)}
                            />
                            <Button
                              type="primary"
                              icon={isFlash ? <CheckCircleFilled /> : <ShoppingCartOutlined />}
                              disabled={product.stock <= 0}
                              onClick={() => handleAdd(product)}
                              style={{
                                height: 44,
                                flex: 1,
                                fontSize: 14,
                                ...(isFlash ? { background: '#52c41a', borderColor: '#52c41a' } : {}),
                              }}
                            >
                              {isFlash ? 'Added!' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ========== DESKTOP TABLE LAYOUT ========== */
              <Table
                dataSource={products}
                columns={columns}
                rowKey="id"
                pagination={false}
                scroll={{ x: 800 }}
                locale={{ emptyText: <Empty description="No products found." /> }}
                rowClassName={(record) =>
                  flashIds.has(record.id) ? 'quick-order-row--flash' : ''
                }
                style={{ fontSize: 15 }}
              />
            )}
          </Spin>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Pagination
              current={page}
              total={meta.total}
              pageSize={meta.per_page}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
              size="default"
            />
          </div>
        )}
      </div>

      {/* Sticky Cart Summary */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '2px solid #f0f0f0',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
          zIndex: 100,
          padding: isMobile ? '10px 12px' : '12px 24px',
        }}
      >
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <Space size={isMobile ? 12 : 24}>
            <Badge count={itemCount} showZero overflowCount={999}>
              <ShoppingCartOutlined style={{ fontSize: isMobile ? 22 : 28 }} />
            </Badge>
            <div>
              <Text strong style={{ fontSize: isMobile ? 14 : 18 }}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>
              <br />
              <Text style={{ fontSize: isMobile ? 13 : 16 }}>
                Subtotal: <strong>{formatPrice(subtotal)}</strong>
              </Text>
            </div>
          </Space>

          <Space size={8} wrap>
            {cartItems.length > 0 && (
              <Button
                icon={<DeleteOutlined />}
                size={isMobile ? 'middle' : 'large'}
                onClick={() => navigate('/cart')}
                style={{ height: isMobile ? 40 : 48, fontSize: isMobile ? 13 : 16 }}
              >
                Cart
              </Button>
            )}
            <Button
              type="primary"
              size={isMobile ? 'middle' : 'large'}
              icon={<ShoppingCartOutlined />}
              disabled={cartItems.length === 0}
              onClick={() => navigate('/checkout')}
              style={{ height: isMobile ? 40 : 48, fontSize: isMobile ? 13 : 16, minWidth: isMobile ? 120 : 180 }}
            >
              Checkout ({formatPrice(subtotal)})
            </Button>
          </Space>
        </div>
      </div>

      {/* Inline styles for flash animation */}
      <style>{`
        .quick-order-row--flash td {
          background: #f6ffed !important;
          transition: background 0.3s ease;
        }
        /* High-contrast large text for older stylists */
        .ant-table-cell {
          font-size: 15px !important;
          padding: 14px 12px !important;
        }
        .ant-table-thead > tr > th {
          font-size: 14px !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
}

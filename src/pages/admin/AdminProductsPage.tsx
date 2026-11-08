'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Typography, Table, Button, Tag, Input, Space, Card, InputNumber, Select, Row, Col, App, Checkbox, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useGetCategoriesQuery, useGetBrandsQuery, type VisibilityFilter } from '@/features/products/api';
import { productVisibleTo, visibilitySummary } from '@/shared/utils/productVisibility';
import {
  useGetAllProductsQuery,
  useDeleteProductMutation,
} from '@/features/admin/api';
import ProductEditorModal from '@/features/admin/ProductEditorModal';
import type { Product, ProductReviewReason } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Title, Text } = Typography;
const ITEMS_PER_PAGE = 20;
const DEFAULT_MAX_PRICE = 1000000000;

/** Work queues the dashboard to-do list links to (?queue=...). */
type WorkQueue = '' | 'missing_price' | 'low_stock' | 'out_of_stock';
const WORK_QUEUE_OPTIONS: { value: WorkQueue; label: string }[] = [
  { value: '', label: 'Any price & stock' },
  { value: 'missing_price', label: 'Missing retail or salon price' },
  { value: 'low_stock', label: 'Low stock (1–3)' },
  { value: 'out_of_stock', label: 'Out of stock' },
];
const isWorkQueue = (value: string | null): value is WorkQueue =>
  WORK_QUEUE_OPTIONS.some((option) => option.value === value);
const REVIEW_REASON_LABELS: Record<ProductReviewReason, string> = {
  no_photo: 'a real photo',
  no_brand: 'a real brand',
  no_category: 'a real category',
};

const VISIBILITY_FILTER_OPTIONS: { value: '' | VisibilityFilter; label: string }[] = [
  { value: '', label: 'Any visibility' },
  { value: 'everyone', label: 'Shown to everyone' },
  { value: 'limited', label: 'Limited or hidden' },
  { value: 'hidden', label: 'Hidden from everyone' },
  { value: 'guests', label: 'Shown to guests' },
  { value: 'customers', label: 'Shown to customers' },
  { value: 'stylists', label: 'Shown to stylists' },
];

export default function AdminProductsPage() {
  const { modal, message } = App.useApp();
  const [searchParams] = useSearchParams();
  const initialReview = searchParams.get('review');
  const initialQueue = searchParams.get('queue');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, DEFAULT_MAX_PRICE]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'' | 'in_review' | 'ready'>(
    initialReview === 'in_review' || initialReview === 'ready' ? initialReview : '',
  );
  const [workQueue, setWorkQueue] = useState<WorkQueue>(isWorkQueue(initialQueue) ? initialQueue : '');
  const [visibilityFilter, setVisibilityFilter] = useState<'' | VisibilityFilter>('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const debouncedPriceRange = useDebounce(priceRange, 400);
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;
  const hasPriceFilter = debouncedPriceRange[0] !== 0 || debouncedPriceRange[1] !== DEFAULT_MAX_PRICE;
  const hasPendingFilterState =
    search.length > 0 ||
    category.length > 0 ||
    brand.length > 0 ||
    inStockOnly ||
    reviewFilter !== '' ||
    visibilityFilter !== '' ||
    workQueue !== '' ||
    priceRange[0] !== 0 ||
    priceRange[1] !== DEFAULT_MAX_PRICE ||
    sortBy !== 'name_asc';

  const sortOptions = useMemo(() => [
    { value: 'name_asc', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
    { value: 'price_asc', label: 'Price Low to High' },
    { value: 'price_desc', label: 'Price High to Low' },
    { value: 'newest', label: 'Newest First' },
  ], []);

  const queryParams = useMemo(() => ({
    page,
    perPage: ITEMS_PER_PAGE,
    search: searchQuery,
    category: category || undefined,
    brand: brand || undefined,
    sort: sortBy,
    min_price: debouncedPriceRange[0],
    max_price: debouncedPriceRange[1],
    in_stock: inStockOnly ? 1 : undefined,
    review: reviewFilter || undefined,
    visibility: visibilityFilter || undefined,
    price_status: workQueue === 'missing_price' ? 'missing' as const : undefined,
    stock: workQueue === 'low_stock' ? 'low' as const : workQueue === 'out_of_stock' ? 'out' as const : undefined,
  }), [page, searchQuery, category, brand, sortBy, debouncedPriceRange, inStockOnly, reviewFilter, visibilityFilter, workQueue]);

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data, isLoading, refetch } = useGetAllProductsQuery(queryParams);

  const selectedCategoryName = category
    ? categories.find((item) => String(item.id) === category)?.name ?? category
    : '';
  const selectedBrandName = brand
    ? brands.find((item) => String(item.id) === brand)?.name ?? brand
    : '';
  const activeFiltersCount = [
    searchQuery,
    category,
    brand,
    inStockOnly,
    reviewFilter,
    visibilityFilter,
    workQueue,
    hasPriceFilter,
  ].filter(Boolean).length;

  const [deleteProduct] = useDeleteProductMutation();

  useEffect(() => {
    const lastPage = data?.meta?.last_page ?? 1;

    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [data?.meta?.last_page, page]);


  /* ============================== handlers ============================== */

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  }, []);

  const clearAllFilters = () => {
    setSearch('');
    setCategory('');
    setBrand('');
    setPriceRange([0, DEFAULT_MAX_PRICE]);
    setInStockOnly(false);
    setReviewFilter('');
    setVisibilityFilter('');
    setWorkQueue('');
    setSortBy('name_asc');
    setPage(1);
  };

  const handleDelete = (productId: string | number) => {
    modal.confirm({
      title: 'Delete Product',
      content: 'Are you sure you want to delete this product?',
      onOk: async () => {
        try {
          await deleteProduct(String(productId)).unwrap();
          message.success('Product deleted successfully');
        } catch (error: any) {
          message.error(error?.data?.message || 'Failed to delete product');
        }
      },
    });
  };


  /* ============================== columns ============================== */

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_: unknown, record: Product) => (
        <Space>
          <img
            src={record.image || '/placeholder.svg'}
            alt={record.name}
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
          />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary">{typeof record.brand === 'object' ? (record.brand as any)?.name : record.brand}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: any) => {
        const name = typeof cat === 'object' ? cat?.name : cat;
        return <Tag>{(name || '').replace('-', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Retail Price',
      key: 'retailPrice',
      render: (_: unknown, record: Product) => formatPrice(Number(record.price ?? 0)),
    },
    {
      title: 'Stylist Price',
      key: 'stylistPrice',
      render: (_: unknown, record: Product) => (
        <Text style={{ color: '#16a34a' }}>
          {formatPrice(Number(record.stylistPrice ?? 0))}
        </Text>
      ),
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (_: unknown, record: Product) => {
        const total = record.quantity ?? 0;
        return total > 10 ? (
          <Tag color="green">{total}</Tag>
        ) : total > 0 ? (
          <Tag color="orange">{total}</Tag>
        ) : (
          <Tag color="red">0</Tag>
        );
      },
    },
    {
      title: 'Access',
      key: 'access',
      render: (_: unknown, record: Product) =>
        record.inReview
          ? (
            <Tooltip title={`Hidden from customers and stylists until it has ${(record.reviewReasons ?? []).map((reason) => REVIEW_REASON_LABELS[reason]).join(', ')}.`}>
              <Tag color="orange">IN REVIEW · ADMIN ONLY</Tag>
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 4 }}>
                Needs {(record.reviewReasons ?? []).map((reason) => REVIEW_REASON_LABELS[reason]).join(' · ')}
              </div>
            </Tooltip>
          )
          : (() => {
            const summary = visibilitySummary(productVisibleTo(record));
            return <Tag color={summary.color}>{summary.label.toUpperCase()}</Tag>;
          })(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Product) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
          <Link to={`/admin/catalog-images?product=${record.id}`}>Images</Link>
          <Button type="text" aria-label={`Delete ${record.name}`} danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  /* ============================== render ============================== */

  const totalProducts = data?.meta?.total || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Products</Title>
          <Text type="secondary">
            {totalProducts} products in catalog
            {activeFiltersCount > 0 ? ` • ${activeFiltersCount} filters applied` : ''}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingProduct(null);
            setModalOpen(true);
          }}
        >
          Add Product
        </Button>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Search</Text>
            <Input
              placeholder="Search products (min 2 chars)..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>

          <Col xs={24} sm={12} xl={4}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Category</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="All categories"
              allowClear
              value={category || undefined}
              onChange={(value) => {
                setCategory(value || '');
                setPage(1);
              }}
              options={categories.map((item) => ({
                label: item.name,
                value: String(item.id),
              }))}
            />
          </Col>

          <Col xs={24} sm={12} xl={4}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Brand</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="All brands"
              allowClear
              value={brand || undefined}
              onChange={(value) => {
                setBrand(value || '');
                setPage(1);
              }}
              options={brands.map((item) => ({
                label: item.name,
                value: String(item.id),
              }))}
            />
          </Col>

          <Col xs={24} sm={12} xl={4}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Sort</Text>
            <Select
              style={{ width: '100%' }}
              value={sortBy}
              onChange={(value) => {
                setSortBy(value);
                setPage(1);
              }}
              options={sortOptions}
            />
          </Col>

          <Col xs={12} sm={6} xl={2}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Min Price</Text>
            <InputNumber
              min={0}
              placeholder="0"
              value={priceRange[0] || undefined}
              onChange={(value) => {
                setPriceRange([value ?? 0, priceRange[1]]);
                setPage(1);
              }}
              style={{ width: '100%' }}
            />
          </Col>

          <Col xs={12} sm={6} xl={2}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Max Price</Text>
            <InputNumber
              min={0}
              placeholder="Any"
              value={priceRange[1] < DEFAULT_MAX_PRICE ? priceRange[1] : undefined}
              onChange={(value) => {
                setPriceRange([priceRange[0], value ?? DEFAULT_MAX_PRICE]);
                setPage(1);
              }}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={reviewFilter}
              onChange={(value) => {
                setReviewFilter(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All products' },
                { value: 'in_review', label: 'In review (admin only)' },
                { value: 'ready', label: 'Ready for sale' },
              ]}
            />
          </Col>

          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={visibilityFilter}
              onChange={(value) => {
                setVisibilityFilter(value);
                setPage(1);
              }}
              options={VISIBILITY_FILTER_OPTIONS}
            />
          </Col>

          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={workQueue}
              onChange={(value) => {
                setWorkQueue(value);
                setPage(1);
              }}
              options={WORK_QUEUE_OPTIONS}
            />
          </Col>

          <Col xs={12} md={3} style={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={inStockOnly}
              onChange={(event) => {
                setInStockOnly(event.target.checked);
                setPage(1);
              }}
            >
              In stock only
            </Checkbox>
          </Col>

          <Col xs={12} md={3} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={clearAllFilters} disabled={!hasPendingFilterState}>
              Clear Filters
            </Button>
          </Col>
        </Row>

        {activeFiltersCount > 0 && (
          <Space wrap style={{ marginTop: 16 }}>
            {category && (
              <Tag
                closable
                color="green"
                onClose={() => {
                  setCategory('');
                  setPage(1);
                }}
              >
                {selectedCategoryName}
              </Tag>
            )}
            {brand && (
              <Tag
                closable
                color="blue"
                onClose={() => {
                  setBrand('');
                  setPage(1);
                }}
              >
                {selectedBrandName}
              </Tag>
            )}
            {searchQuery && (
              <Tag
                closable
                color="purple"
                onClose={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                {searchQuery}
              </Tag>
            )}
            {hasPriceFilter && (
              <Tag
                closable
                color="gold"
                onClose={() => {
                  setPriceRange([0, DEFAULT_MAX_PRICE]);
                  setPage(1);
                }}
              >
                {`Price ${debouncedPriceRange[0] > 0 ? formatPrice(debouncedPriceRange[0]) : 'Any'} - ${debouncedPriceRange[1] < DEFAULT_MAX_PRICE ? formatPrice(debouncedPriceRange[1]) : 'Any'}`}
              </Tag>
            )}
            {reviewFilter && (
              <Tag
                closable
                color="orange"
                onClose={() => {
                  setReviewFilter('');
                  setPage(1);
                }}
              >
                {reviewFilter === 'in_review' ? 'In review' : 'Ready for sale'}
              </Tag>
            )}
            {visibilityFilter && (
              <Tag
                closable
                color="purple"
                onClose={() => {
                  setVisibilityFilter('');
                  setPage(1);
                }}
              >
                {VISIBILITY_FILTER_OPTIONS.find((option) => option.value === visibilityFilter)?.label}
              </Tag>
            )}
            {workQueue && (
              <Tag
                closable
                color="red"
                onClose={() => {
                  setWorkQueue('');
                  setPage(1);
                }}
              >
                {WORK_QUEUE_OPTIONS.find((option) => option.value === workQueue)?.label}
              </Tag>
            )}
            {inStockOnly && (
              <Tag
                closable
                color="cyan"
                onClose={() => {
                  setInStockOnly(false);
                  setPage(1);
                }}
              >
                In Stock Only
              </Tag>
            )}
          </Space>
        )}
      </Card>

      <Card>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          onRow={(record) => ({
            onClick: () => handleEdit(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: ITEMS_PER_PAGE,
            total: totalProducts,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} products`,
          }}
        />
      </Card>

      <ProductEditorModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={() => refetch()}
      />
    </div>
  );
}

/**
 * Home Page - Shop First Design
 * 
 * Main shopping page featuring:
 * - Product grid with immediate visibility
 * - Sidebar filters (desktop) / Drawer filters (mobile)
 * - Search and sort functionality
 * - Backend-driven pagination and filtering
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Row, Col, Input, Select, Checkbox, Card, Typography, 
  Space, Button, Spin, Empty, Drawer, Pagination,
  Badge, Tag, Alert, InputNumber,
} from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import ProductCard from '@/components/ProductCard';
import { useGetProductsQuery, useGetCategoriesQuery, useGetBrandsQuery } from '@/features/products/api';
import { useDebounce } from '@/hooks/useDebounce';

const { Title, Text } = Typography;

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A-Z' },
  { value: 'name_desc', label: 'Name: Z-A' },
];

const ITEMS_PER_PAGE = 12;

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter states from URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(searchParams.get('min_price')) || 0,
    Number(searchParams.get('max_price')) || 1000000000
  ]);
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('in_stock') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'featured');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

  // Debounce search to prevent API spam (only call backend 300ms after user stops typing)
  const debouncedSearch = useDebounce(search, 300);
  
  // Debounce price range to prevent API spam when dragging sliders
  const debouncedPriceRange = useDebounce(priceRange, 400);

  // Only search if 2+ characters (prevent spam)
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  // Memoize query parameters to prevent unnecessary re-fetches
  const queryParams = useMemo(() => ({
    page: currentPage,
    perPage: ITEMS_PER_PAGE,
    search: searchQuery,
    category: category || undefined,
    brand: brand || undefined,
    sort: sortBy,
    min_price: debouncedPriceRange[0],
    max_price: debouncedPriceRange[1],
    in_stock: inStockOnly ? 1 : undefined,
  }), [currentPage, searchQuery, category, brand, sortBy, debouncedPriceRange, inStockOnly]);

  // API calls with all filter params - backend handles filtering
  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useGetProductsQuery(queryParams);
  const { data: categoriesData, isLoading: isLoadingCategories } = useGetCategoriesQuery();
  const { data: brandsData, isLoading: isLoadingBrands } = useGetBrandsQuery();

// Extract data from API response
const products = productsData?.data ?? [];
const categories = categoriesData ?? [];
const brands = brandsData ?? [];
const selectedCategoryName = category
  ? categories.find((c) => String(c.id) === category)?.name ?? category
  : '';
const selectedBrandName = brand
  ? brands.find((b) => String(b.id) === brand)?.name ?? brand
  : '';

// Pagination (already normalized in RTK)
const totalProducts = productsData?.meta?.total ?? 0;
const backendCurrentPage = productsData?.meta?.current_page ?? 1;

const isLoading = isLoadingProducts && !productsData;



  // Count active filters
  const activeFiltersCount = [
    searchQuery,
    category,
    brand,
    inStockOnly,
    debouncedPriceRange[0] !== 0 || debouncedPriceRange[1] !== 1000000000
  ].filter(Boolean).length;

  // URL parameter handlers
  const updateUrlParam = (key: string, value: string | number | null) => {
  const params = new URLSearchParams(searchParams.toString());

  if (value !== null && value !== '' && value !== undefined) {
    params.set(key, String(value));
  } else {
    params.delete(key);
  }

  // Always reset to page 1 when filter changes
  if (key !== 'page') {
    params.set('page', '1');
    setCurrentPage(1);
  }

  setSearchParams(params);
};


  const clearAllFilters = () => {
    setSearch('');
    setCategory('');
    setBrand('');
    setPriceRange([0, 1000]);
    setInStockOnly(false);
    setSortBy('featured');
    setCurrentPage(1);
    setSearchParams({});
  };

const handlePageChange = (page: number) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('page', String(page));

  setCurrentPage(page);
  setSearchParams(params);

  window.scrollTo({ top: 0, behavior: 'smooth' });
};


  // Render filters
  const filterContent = (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Search */}
      <Input
        placeholder="Search products (min 2 chars)..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => {
          const value = e.target.value;
          setSearch(value);
          // Don't update URL immediately - wait for debounce
          // updateUrlParam will be handled by useEffect when searchQuery changes
        }}
        onBlur={() => {
          // Update URL when user leaves the search field
          if (searchQuery) {
            updateUrlParam('search', searchQuery);
          } else {
            updateUrlParam('search', null);
          }
        }}
        allowClear
      />

      {/* Category Filter */}
      <div>
        <Text strong>Category</Text>
        <Select
          style={{ width: '100%', marginTop: 8 }}
          placeholder="All Categories"
          allowClear
          value={category || undefined}
          onChange={(value) => {
            setCategory(value || '');
            updateUrlParam('category', value || null);
          }}
          loading={isLoadingCategories}
          options={categories.map(cat => ({
            label: cat.name,
            value: String(cat.id),
          }))}
        />
      </div>

      {/* Brand Filter */}
      <div>
        <Text strong>Brand</Text>
        <Select
          style={{ width: '100%', marginTop: 8 }}
          placeholder="All Brands"
          allowClear
          value={brand || undefined}
          onChange={(value) => {
            setBrand(value || '');
            updateUrlParam('brand', value || null);
          }}
          loading={isLoadingBrands}
          options={brands.map(b => ({
            label: b.name,
            value: String(b.id),
          }))}
        />
      </div>

      {/* Sort */}
      <div>
        <Text strong>Sort By</Text>
        <Select
          style={{ width: '100%', marginTop: 8 }}
          value={sortBy}
          onChange={(value) => {
            setSortBy(value);
            updateUrlParam('sort', value);
          }}
          options={sortOptions}
        />
      </div>

      {/* Price Range */}
      <div>
        <Text strong>Price Range (MKD)</Text>
        <Space style={{ width: '100%', marginTop: 8 }} size={8}>
          <InputNumber
            placeholder="Min"
            min={0}
            value={priceRange[0] || undefined}
            onChange={(val) => {
              const newMin = val ?? 0;
              setPriceRange([newMin, priceRange[1]]);
            }}
            onBlur={() => updateUrlParam('min_price', priceRange[0] || null)}
            style={{ width: '100%' }}
          />
          <span>–</span>
          <InputNumber
            placeholder="Max"
            min={0}
            value={priceRange[1] < 1000000000 ? priceRange[1] : undefined}
            onChange={(val) => {
              const newMax = val ?? 1000000000;
              setPriceRange([priceRange[0], newMax]);
            }}
            onBlur={() => updateUrlParam('max_price', priceRange[1] < 1000000000 ? priceRange[1] : null)}
            style={{ width: '100%' }}
          />
        </Space>
      </div>

      {/* In Stock */}
      <Checkbox 
        checked={inStockOnly}
        onChange={(e) => {
          setInStockOnly(e.target.checked);
          updateUrlParam('in_stock', e.target.checked ? 'true' : null);
        }}
      >
        In Stock Only
      </Checkbox>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button 
          block 
          danger 
          ghost
          onClick={clearAllFilters}
        >
          Clear All Filters
        </Button>
      )}
    </Space>
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 200px)', padding: '24px' }}>
      {/* Error Alert */}
      {productsError && (
        <Alert
          message="Failed to load products"
          description={`Please make sure the API server is running on ${import.meta.env.VITE_API_URL}`}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* Desktop Filters Sidebar */}
        <Col xs={0} sm={0} md={6} lg={5} xl={4}>
          <Card style={{ position: 'sticky', top: 20 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Title level={4}>
                Filters {activeFiltersCount > 0 && <Badge count={activeFiltersCount} />}
              </Title>
              {filterContent}
            </Space>
          </Card>
        </Col>

        {/* Main Content */}
        <Col xs={24} sm={24} md={18} lg={19} xl={20}>
          {/* Mobile Filter Button */}
          <div className="mobile-filter-btn" style={{ marginBottom: 16 }}>
            <Button 
              icon={<FilterOutlined />}
              onClick={() => setMobileFiltersOpen(true)}
              block
              size="large"
              style={{ height: 48 }}
            >
              Filters {activeFiltersCount > 0 && <Badge count={activeFiltersCount} />}
            </Button>
          </div>

          {/* Results Header */}
          <div style={{ marginBottom: 24 }}>
            <Title level={3}>
              {category && <Tag color="green">{selectedCategoryName}</Tag>}
              {brand && <Tag color="blue">{selectedBrandName}</Tag>}
              {search && <Tag color="purple">{search}</Tag>}
            </Title>
            <Text type="secondary">
              Showing {products.length} of {totalProducts} products
            </Text>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
          ) : products.length > 0 ? (
            <>
              <Row gutter={[16, 16]}>
                {products.map((product) => (
                  <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                    <ProductCard product={product} />
                  </Col>
                ))}
              </Row>

              {/* Pagination */}
              {totalProducts > ITEMS_PER_PAGE && (
                <div style={{ marginTop: 32, textAlign: 'center' }}>
                    <Pagination
                      current={backendCurrentPage}
                      total={totalProducts}
                      pageSize={ITEMS_PER_PAGE}
                      onChange={handlePageChange}
                      showSizeChanger={false}
                      showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} products`}
                    />
                </div>
              )}
            </>
          ) : (
            <Empty 
              description={activeFiltersCount > 0 ? 'No products match your filters' : 'No products available'}
              style={{ marginTop: 50 }}
            >
              {activeFiltersCount > 0 && (
                <Button type="primary" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
              )}
            </Empty>
          )}
        </Col>
      </Row>

      {/* Mobile Filters Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Filters {activeFiltersCount > 0 && <Badge count={activeFiltersCount} />}</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileFiltersOpen(false)}
        open={mobileFiltersOpen}
      >
        {filterContent}
      </Drawer>
    </div>
  );
}

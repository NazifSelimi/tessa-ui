/**
 * Home Page - Shop First Design
 * 
 * Main shopping page featuring:
 * - Product grid with immediate visibility
 * - Sidebar filters (desktop) / Drawer filters (mobile)
 * - Search and sort functionality
 * - Backend-driven pagination and filtering
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Row, Col, Input, Select, Checkbox, Card, Typography, 
  Space, Button, Spin, Empty, Drawer, Pagination,
  Badge, Tag, Alert, InputNumber, Grid, Tabs, List,
} from 'antd';
import { SearchOutlined, FilterOutlined, CloseOutlined, AppstoreOutlined, TagsOutlined, SortAscendingOutlined } from '@ant-design/icons';
import ProductCard from '@/components/ProductCard';
import { useGetProductsQuery, useGetCategoriesQuery, useGetBrandsQuery } from '@/features/products/api';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/useDebounce';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const ITEMS_PER_PAGE = 12;

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<any>(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { t } = useTranslation();

  const sortOptions = useMemo(() => [
    { value: 'name_asc', label: t('home.nameAZ') },
    { value: 'name_desc', label: t('home.nameZA') },
    { value: 'price_asc', label: t('home.priceLowHigh') },
    { value: 'price_desc', label: t('home.priceHighLow') },
    { value: 'newest', label: t('home.newest') },
  ], [t]);

  // Filter states from URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(searchParams.get('min_price')) || 0,
    Number(searchParams.get('max_price')) || 1000000000
  ]);
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('in_stock') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'name_asc');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

  // Debounce search to prevent API spam (only call backend 300ms after user stops typing)
  const debouncedSearch = useDebounce(search, 300);
  
  // Debounce price range to prevent API spam when dragging sliders
  const debouncedPriceRange = useDebounce(priceRange, 400);

  // Only search if 2+ characters (prevent spam)
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  // Listen for bottom nav search toggle
  useEffect(() => {
    const handleToggleSearch = () => {
      setMobileSearchOpen((prev) => {
        const next = !prev;
        if (next) {
          // Focus the search input after it opens
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
        return next;
      });
    };
    window.addEventListener('toggle-mobile-search', handleToggleSearch);
    return () => window.removeEventListener('toggle-mobile-search', handleToggleSearch);
  }, []);

  // Close mobile search when switching to desktop
  useEffect(() => {
    if (!isMobile) setMobileSearchOpen(false);
  }, [isMobile]);

  // Scroll to top when search results change
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length >= 2) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [debouncedSearch]);

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
    setSortBy('name_asc');
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
        placeholder={t('home.searchProducts')}
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
        <Text strong>{t('product.category')}</Text>
        <Select
          style={{ width: '100%', marginTop: 8 }}
          placeholder={t('home.allCategories')}
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
        <Text strong>{t('product.brand')}</Text>
        <Select
          style={{ width: '100%', marginTop: 8 }}
          placeholder={t('home.allBrands')}
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
        <Text strong>{t('home.sortBy')}</Text>
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
        <Text strong>{t('home.priceRange')} (MKD)</Text>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <InputNumber
            placeholder="Min"
            min={0}
            value={priceRange[0] || undefined}
            onChange={(val) => {
              const newMin = val ?? 0;
              setPriceRange([newMin, priceRange[1]]);
            }}
            onBlur={() => updateUrlParam('min_price', priceRange[0] || null)}
            style={{ flex: 1, minWidth: 0 }}
          />
          <span style={{ flexShrink: 0 }}>–</span>
          <InputNumber
            placeholder="Max"
            min={0}
            value={priceRange[1] < 1000000000 ? priceRange[1] : undefined}
            onChange={(val) => {
              const newMax = val ?? 1000000000;
              setPriceRange([priceRange[0], newMax]);
            }}
            onBlur={() => updateUrlParam('max_price', priceRange[1] < 1000000000 ? priceRange[1] : null)}
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
      </div>

      {/* In Stock */}
      <Checkbox 
        checked={inStockOnly}
        onChange={(e) => {
          setInStockOnly(e.target.checked);
          updateUrlParam('in_stock', e.target.checked ? 'true' : null);
        }}
      >
        {t('home.inStockOnly')}
      </Checkbox>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button 
          block 
          danger 
          ghost
          onClick={clearAllFilters}
        >
          {t('home.clearFilters')}
        </Button>
      )}
    </Space>
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Mobile Slide-Down Search Bar */}
      {mobileSearchOpen && (
        <div className="mobile-search-bar mobile-search-bar--open">
          <div className="mobile-search-bar__inner">
            <Input
              ref={searchInputRef}
              placeholder={t('home.searchProducts')}
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => {
                if (searchQuery) {
                  updateUrlParam('search', searchQuery);
                } else {
                  updateUrlParam('search', null);
                }
              }}
              allowClear
              size="large"
              style={{ fontSize: 16 }}
            />
            <Button
              type="text"
              shape="circle"
              icon={<CloseOutlined />}
              onClick={() => { setMobileSearchOpen(false); }}
              className="mobile-search-bar__close"
              aria-label="Close search"
            />
          </div>
        </div>
      )}

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
                {t('home.filters')} {activeFiltersCount > 0 && <Badge count={activeFiltersCount} />}
              </Title>
              {filterContent}
            </Space>
          </Card>
        </Col>

        {/* Main Content */}
        <Col xs={24} sm={24} md={18} lg={19} xl={20}>
          {/* Active filter tags (mobile) - show when filters are applied */}
          {isMobile && activeFiltersCount > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {category && <Tag closable onClose={() => { setCategory(''); updateUrlParam('category', null); }} color="green">{selectedCategoryName}</Tag>}
              {brand && <Tag closable onClose={() => { setBrand(''); updateUrlParam('brand', null); }} color="blue">{selectedBrandName}</Tag>}
              {search && <Tag closable onClose={() => { setSearch(''); updateUrlParam('search', null); }} color="purple">{search}</Tag>}
              {inStockOnly && <Tag closable onClose={() => { setInStockOnly(false); updateUrlParam('in_stock', null); }} color="cyan">{t('home.inStockOnly')}</Tag>}
              <Button type="link" size="small" danger onClick={clearAllFilters} style={{ padding: 0, height: 'auto' }}>
                {t('home.clearFilters')}
              </Button>
            </div>
          )}

          {/* Results Header */}
          <div style={{ marginBottom: 16 }}>
            {/* Desktop: show filter tags inline */}
            {!isMobile && (
              <Title level={4} style={{ marginBottom: 4 }}>
                {category && <Tag color="green">{selectedCategoryName}</Tag>}
                {brand && <Tag color="blue">{selectedBrandName}</Tag>}
                {search && <Tag color="purple">{search}</Tag>}
              </Title>
            )}
            <Text type="secondary">
              {t('home.showing')} {products.length} {t('home.of')} {totalProducts} {t('home.products')}
            </Text>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin size="large" />
            </div>
          ) : products.length > 0 ? (
            <>
              <Row gutter={[12, 12]}>
                {products.map((product, index) => (
                  <Col key={product.id} xs={12} sm={12} md={8} lg={6}>
                    <ProductCard product={product} priority={index < 4} />
                  </Col>
                ))}
              </Row>

              {/* Pagination */}
              {totalProducts > ITEMS_PER_PAGE && (
                <div style={{ marginTop: 24, textAlign: 'center', paddingBottom: isMobile ? 80 : 0 }}>
                    <Pagination
                      current={backendCurrentPage}
                      total={totalProducts}
                      pageSize={ITEMS_PER_PAGE}
                      onChange={handlePageChange}
                      showSizeChanger={false}
                      showTotal={(total, range) => `${range[0]}-${range[1]} of ${total}`}
                      size="small"
                    />
                </div>
              )}
            </>
          ) : (
            <Empty 
              description={activeFiltersCount > 0 ? t('home.noProductsFound') : t('home.noProductsFound')}
              style={{ marginTop: 50 }}
            >
              {activeFiltersCount > 0 && (
                <Button type="primary" onClick={clearAllFilters}>
                  {t('home.clearFilters')}
                </Button>
              )}
            </Empty>
          )}
        </Col>
      </Row>

      {/* Mobile Floating Filter FAB */}
      {isMobile && (
        <button
          className="filter-fab"
          onClick={() => setMobileFiltersOpen(true)}
          aria-label="Open filters"
        >
          <FilterOutlined style={{ fontSize: 20 }} />
          {activeFiltersCount > 0 && (
            <span className="filter-fab__badge">{activeFiltersCount}</span>
          )}
        </button>
      )}

      {/* Mobile Filters Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('home.filters')} {activeFiltersCount > 0 && <Badge count={activeFiltersCount} />}</span>
          </div>
        }
        placement="bottom"
        onClose={() => setMobileFiltersOpen(false)}
        open={mobileFiltersOpen}
        height="85vh"
        styles={{
          header: { borderBottom: '1px solid #f0f0f0' },
          body: { padding: 0, paddingBottom: 80 },
        }}
        className="mobile-filter-drawer"
      >
        <Tabs
          defaultActiveKey="categories"
          centered
          style={{ width: '100%' }}
          items={[
            {
              key: 'categories',
              label: (
                <span><AppstoreOutlined /> {t('product.category')}</span>
              ),
              children: (
                <div style={{ padding: '0 16px' }}>
                  <List
                    loading={isLoadingCategories}
                    dataSource={[{ id: '', name: t('home.allCategories') }, ...categories]}
                    renderItem={(cat) => (
                      <List.Item
                        onClick={() => {
                          setCategory(cat.id ? String(cat.id) : '');
                          updateUrlParam('category', cat.id ? String(cat.id) : null);
                        }}
                        style={{
                          cursor: 'pointer',
                          background: String(cat.id || '') === category ? 'var(--color-primary-light, #e6f7ff)' : 'transparent',
                          fontWeight: String(cat.id || '') === category ? 600 : 400,
                          padding: '12px 16px',
                          borderRadius: 8,
                        }}
                      >
                        {cat.name}
                      </List.Item>
                    )}
                  />
                </div>
              ),
            },
            {
              key: 'brands',
              label: (
                <span><TagsOutlined /> {t('product.brand')}</span>
              ),
              children: (
                <div style={{ padding: '0 16px' }}>
                  <List
                    loading={isLoadingBrands}
                    dataSource={[{ id: '', name: t('home.allBrands') }, ...brands]}
                    renderItem={(b) => (
                      <List.Item
                        onClick={() => {
                          setBrand(b.id ? String(b.id) : '');
                          updateUrlParam('brand', b.id ? String(b.id) : null);
                        }}
                        style={{
                          cursor: 'pointer',
                          background: String(b.id || '') === brand ? 'var(--color-primary-light, #e6f7ff)' : 'transparent',
                          fontWeight: String(b.id || '') === brand ? 600 : 400,
                          padding: '12px 16px',
                          borderRadius: 8,
                        }}
                      >
                        {b.name}
                      </List.Item>
                    )}
                  />
                </div>
              ),
            },
            {
              key: 'filters',
              label: (
                <span><FilterOutlined /> {t('home.filters')}</span>
              ),
              children: (
                <div style={{ padding: '0 16px' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {/* Search */}
                    <Input
                      placeholder={t('home.searchProducts')}
                      prefix={<SearchOutlined />}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onBlur={() => {
                        if (searchQuery) {
                          updateUrlParam('search', searchQuery);
                        } else {
                          updateUrlParam('search', null);
                        }
                      }}
                      allowClear
                    />

                    {/* Price Range */}
                    <div>
                      <Text strong>{t('home.priceRange')} (MKD)</Text>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                        <InputNumber
                          placeholder="Min"
                          min={0}
                          value={priceRange[0] || undefined}
                          onChange={(val) => {
                            const newMin = val ?? 0;
                            setPriceRange([newMin, priceRange[1]]);
                          }}
                          onBlur={() => updateUrlParam('min_price', priceRange[0] || null)}
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <span style={{ flexShrink: 0 }}>–</span>
                        <InputNumber
                          placeholder="Max"
                          min={0}
                          value={priceRange[1] < 1000000000 ? priceRange[1] : undefined}
                          onChange={(val) => {
                            const newMax = val ?? 1000000000;
                            setPriceRange([priceRange[0], newMax]);
                          }}
                          onBlur={() => updateUrlParam('max_price', priceRange[1] < 1000000000 ? priceRange[1] : null)}
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      </div>
                    </div>

                    {/* In Stock */}
                    <Checkbox
                      checked={inStockOnly}
                      onChange={(e) => {
                        setInStockOnly(e.target.checked);
                        updateUrlParam('in_stock', e.target.checked ? 'true' : null);
                      }}
                    >
                      {t('home.inStockOnly')}
                    </Checkbox>

                    {/* Clear Filters */}
                    {activeFiltersCount > 0 && (
                      <Button block danger ghost onClick={clearAllFilters}>
                        {t('home.clearFilters')}
                      </Button>
                    )}
                  </Space>
                </div>
              ),
            },
            {
              key: 'sort',
              label: (
                <span><SortAscendingOutlined /> {t('home.sortBy')}</span>
              ),
              children: (
                <div style={{ padding: '0 16px' }}>
                  <List
                    dataSource={sortOptions}
                    renderItem={(opt) => (
                      <List.Item
                        onClick={() => {
                          setSortBy(opt.value);
                          updateUrlParam('sort', opt.value);
                        }}
                        style={{
                          cursor: 'pointer',
                          background: opt.value === sortBy ? 'var(--color-primary-light, #e6f7ff)' : 'transparent',
                          fontWeight: opt.value === sortBy ? 600 : 400,
                          padding: '12px 16px',
                          borderRadius: 8,
                        }}
                      >
                        {opt.label}
                      </List.Item>
                    )}
                  />
                </div>
              ),
            },
          ]}
        />
        
        {/* Sticky apply button at bottom of drawer */}
        <div className="mobile-filter-drawer__footer">
          <Button
            type="primary"
            block
            size="large"
            onClick={() => setMobileFiltersOpen(false)}
            style={{ height: 48 }}
          >
            {t('home.showing')} {totalProducts} {t('home.products')}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

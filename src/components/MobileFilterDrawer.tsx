import { Drawer, Tabs, List, Input, InputNumber, Space, Checkbox, Button, Badge, Typography } from 'antd';
import { SearchOutlined, FilterOutlined, AppstoreOutlined, TagsOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface SortOption {
  value: string;
  label: string;
}

interface FilterProps {
  open: boolean;
  onClose: () => void;
  // Category
  categories: Array<{ id: string | number; name: string }>;
  isLoadingCategories: boolean;
  category: string;
  onCategoryChange: (value: string) => void;
  // Brand
  brands: Array<{ id: string | number; name: string }>;
  isLoadingBrands: boolean;
  brand: string;
  onBrandChange: (value: string) => void;
  // Search
  search: string;
  onSearchChange: (value: string) => void;
  onSearchBlur: () => void;
  // Price
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  onMinPriceBlur: () => void;
  onMaxPriceBlur: () => void;
  // In stock
  inStockOnly: boolean;
  onInStockChange: (checked: boolean) => void;
  // Sort
  sortBy: string;
  sortOptions: SortOption[];
  onSortChange: (value: string) => void;
  // Other
  activeFiltersCount: number;
  totalProducts: number;
  onClearAll: () => void;
}

export default function MobileFilterDrawer(props: FilterProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('home.filters')} {props.activeFiltersCount > 0 && <Badge count={props.activeFiltersCount} />}</span>
        </div>
      }
      placement="bottom"
      onClose={props.onClose}
      open={props.open}
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
            label: <span><AppstoreOutlined /> {t('product.category')}</span>,
            children: (
              <div style={{ padding: '0 16px' }}>
                <List
                  loading={props.isLoadingCategories}
                  dataSource={[{ id: '', name: t('home.allCategories') }, ...props.categories]}
                  renderItem={(cat) => (
                    <List.Item
                      onClick={() => props.onCategoryChange(cat.id ? String(cat.id) : '')}
                      style={{
                        cursor: 'pointer',
                        background: String(cat.id || '') === props.category ? 'var(--color-primary-light, #e6f7ff)' : 'transparent',
                        fontWeight: String(cat.id || '') === props.category ? 600 : 400,
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
            label: <span><TagsOutlined /> {t('product.brand')}</span>,
            children: (
              <div style={{ padding: '0 16px' }}>
                <List
                  loading={props.isLoadingBrands}
                  dataSource={[{ id: '', name: t('home.allBrands') }, ...props.brands]}
                  renderItem={(b) => (
                    <List.Item
                      onClick={() => props.onBrandChange(b.id ? String(b.id) : '')}
                      style={{
                        cursor: 'pointer',
                        background: String(b.id || '') === props.brand ? 'var(--color-primary-light, #e6f7ff)' : 'transparent',
                        fontWeight: String(b.id || '') === props.brand ? 600 : 400,
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
            label: <span><FilterOutlined /> {t('home.filters')}</span>,
            children: (
              <div style={{ padding: '0 16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Input
                    placeholder={t('home.searchProducts')}
                    prefix={<SearchOutlined />}
                    value={props.search}
                    onChange={(e) => props.onSearchChange(e.target.value)}
                    onBlur={props.onSearchBlur}
                    allowClear
                  />
                  <div>
                    <Text strong>{t('home.priceRange')} (MKD)</Text>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <InputNumber
                        placeholder="Min"
                        min={0}
                        value={props.priceRange[0] || undefined}
                        onChange={(val) => props.onPriceRangeChange([val ?? 0, props.priceRange[1]])}
                        onBlur={props.onMinPriceBlur}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <span style={{ flexShrink: 0 }}>–</span>
                      <InputNumber
                        placeholder="Max"
                        min={0}
                        value={props.priceRange[1] < 1000000000 ? props.priceRange[1] : undefined}
                        onChange={(val) => props.onPriceRangeChange([props.priceRange[0], val ?? 1000000000])}
                        onBlur={props.onMaxPriceBlur}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                    </div>
                  </div>
                  <Checkbox
                    checked={props.inStockOnly}
                    onChange={(e) => props.onInStockChange(e.target.checked)}
                  >
                    {t('home.inStockOnly')}
                  </Checkbox>
                  {props.activeFiltersCount > 0 && (
                    <Button block danger ghost onClick={props.onClearAll}>
                      {t('home.clearFilters')}
                    </Button>
                  )}
                </Space>
              </div>
            ),
          },
          {
            key: 'sort',
            label: <span><SortAscendingOutlined /> {t('home.sortBy')}</span>,
            children: (
              <div style={{ padding: '0 16px' }}>
                <List
                  dataSource={props.sortOptions}
                  renderItem={(opt) => (
                    <List.Item
                      onClick={() => props.onSortChange(opt.value)}
                      style={{
                        cursor: 'pointer',
                        background: opt.value === props.sortBy ? 'var(--color-primary-light, #e6f7ff)' : 'transparent',
                        fontWeight: opt.value === props.sortBy ? 600 : 400,
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
      
      <div className="mobile-filter-drawer__footer">
        <Button
          type="primary"
          block
          size="large"
          onClick={props.onClose}
          style={{ height: 48 }}
        >
          {t('home.showing')} {props.totalProducts} {t('home.products')}
        </Button>
      </div>
    </Drawer>
  );
}

import { Drawer, Input, InputNumber, Space, Checkbox, Button, Badge, Typography, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
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
        header: { borderBottom: '1px solid var(--color-border-light)' },
        body: { padding: 0, paddingBottom: 80 },
      }}
      className="mobile-filter-drawer"
    >
      <div className="mobile-filter-drawer__body">
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
                    <Text strong>{t('product.category')}</Text>
                    <Select
                      allowClear
                      loading={props.isLoadingCategories}
                      placeholder={t('home.allCategories')}
                      value={props.category || undefined}
                      onChange={(value) => props.onCategoryChange(value || '')}
                      options={props.categories.map((category) => ({ label: category.name, value: String(category.id) }))}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>
                  <div>
                    <Text strong>{t('product.brand')}</Text>
                    <Select
                      allowClear
                      loading={props.isLoadingBrands}
                      placeholder={t('home.allBrands')}
                      value={props.brand || undefined}
                      onChange={(value) => props.onBrandChange(value || '')}
                      options={props.brands.map((brand) => ({ label: brand.name, value: String(brand.id) }))}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>
                  <div>
                    <Text strong>{t('home.priceRange')} (MKD)</Text>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <InputNumber
                        placeholder={t('home.minPrice')}
                        min={0}
                        value={props.priceRange[0] || undefined}
                        onChange={(val) => props.onPriceRangeChange([val ?? 0, props.priceRange[1]])}
                        onBlur={props.onMinPriceBlur}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <span style={{ flexShrink: 0 }}>–</span>
                      <InputNumber
                        placeholder={t('home.maxPrice')}
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
                  <div>
                    <Text strong>{t('home.sortBy')}</Text>
                    <Select
                      value={props.sortBy}
                      onChange={props.onSortChange}
                      options={props.sortOptions}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>
                  {props.activeFiltersCount > 0 && (
                    <Button block danger ghost onClick={props.onClearAll}>
                      {t('home.clearFilters')}
                    </Button>
                  )}
        </Space>
      </div>
      
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

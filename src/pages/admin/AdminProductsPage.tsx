'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Typography, Table, Button, Tag, Input, Space, Card, Form, InputNumber, Select, Upload, Row, Col, App, Modal, Switch, Checkbox } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useGetCategoriesQuery, useGetBrandsQuery } from '@/features/products/api';
import {
  useGetAllProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateProductStockMutation,
} from '@/features/admin/api';
import type { Product } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/shared/utils/formatPrice';
import { convertToWebP } from '@/shared/utils/imageUtils';

const { Title, Text } = Typography;
const ITEMS_PER_PAGE = 20;
const DEFAULT_MAX_PRICE = 1000000000;

/** The fields the backend actually accepts (matching controller validation). */
interface ProductFormValues {
  name: string;
  price: number;
  stylist_price?: number;
  stylist_only?: boolean;
  normalize_catalog_background?: boolean;
  quantity: number;
  category_id: number;
  brand_id: number;
  description_en?: string;
  description_mk?: string;
  description_shq?: string;
}

/**
 * Build snapshot of current form values from a Product so we can diff later.
 */
function snapshotFromProduct(product: Product): ProductFormValues {
  return {
    name: product.name,
    price: Number(product.price ?? 0),
    stylist_price: Number(product.stylistPrice ?? 0),
    stylist_only: Boolean(product.stylistOnly),
    quantity: product.quantity ?? 0,
    category_id: Number(product.categoryId || (product.category as any)?.id || 0),
    brand_id: Number(product.brandId || (product.brand as any)?.id || 0),
    description_en: product.translations?.en ?? '',
    description_mk: product.translations?.mk ?? '',
    description_shq: product.translations?.shq ?? '',
  };
}

export default function AdminProductsPage() {
  const { modal, message } = App.useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, DEFAULT_MAX_PRICE]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name_asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm<ProductFormValues>();

  const debouncedSearch = useDebounce(search, 300);
  const debouncedPriceRange = useDebounce(priceRange, 400);
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;
  const hasPriceFilter = debouncedPriceRange[0] !== 0 || debouncedPriceRange[1] !== DEFAULT_MAX_PRICE;
  const hasPendingFilterState =
    search.length > 0 ||
    category.length > 0 ||
    brand.length > 0 ||
    inStockOnly ||
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
  }), [page, searchQuery, category, brand, sortBy, debouncedPriceRange, inStockOnly]);

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
    hasPriceFilter,
  ].filter(Boolean).length;

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [_updateStock] = useUpdateProductStockMutation();

  useEffect(() => {
    const lastPage = data?.meta?.last_page ?? 1;

    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [data?.meta?.last_page, page]);

  useEffect(() => {
    if (!modalOpen) return;

    if (editingProduct) {
      form.setFieldsValue({
        ...snapshotFromProduct(editingProduct),
        normalize_catalog_background: false,
      });
      return;
    }

    form.setFieldsValue({
      stylist_only: false,
      normalize_catalog_background: false,
      description_en: '',
      description_mk: '',
      description_shq: '',
    });
  }, [modalOpen, editingProduct, form]);

  /* ============================== handlers ============================== */

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setFileList([]);
    setModalOpen(true);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setCategory('');
    setBrand('');
    setPriceRange([0, DEFAULT_MAX_PRICE]);
    setInStockOnly(false);
    setSortBy('name_asc');
    setPage(1);
  }, []);

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

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();

      if (editingProduct) {
        /* ---- UPDATE: only send fields that actually changed ---- */
        const original = snapshotFromProduct(editingProduct);
        const fieldKeys: (keyof ProductFormValues)[] = [
          'name', 'price', 'stylist_price', 'stylist_only', 'quantity', 'category_id', 'brand_id',
        ];
        let hasChanges = false;

        for (const key of fieldKeys) {
          const newVal = values[key] ?? '';
          const oldVal = original[key] ?? '';

          if (String(newVal) !== String(oldVal)) {
            if (key === 'stylist_only') {
              formData.append(key, newVal ? '1' : '0');
            } else {
              formData.append(key, String(newVal));
            }
            hasChanges = true;
          }
        }

        const translationMap = {
          en: values.description_en ?? '',
          mk: values.description_mk ?? '',
          shq: values.description_shq ?? '',
        };
        const originalTranslationMap = {
          en: String(original.description_en ?? ''),
          mk: String(original.description_mk ?? ''),
          shq: String(original.description_shq ?? ''),
        };

        if (
          translationMap.en !== originalTranslationMap.en ||
          translationMap.mk !== originalTranslationMap.mk ||
          translationMap.shq !== originalTranslationMap.shq
        ) {
          formData.append('translations[en]', translationMap.en);
          formData.append('translations[mk]', translationMap.mk);
          formData.append('translations[shq]', translationMap.shq);
          hasChanges = true;
        }

        // Handle image upload — always send if a new file was picked
        if (fileList.length > 0 && fileList[0].originFileObj) {
          const optimizedFile = await convertToWebP(fileList[0].originFileObj as File, 0.82);
          formData.append('image', optimizedFile, optimizedFile.name);
          formData.append('normalize_catalog_background', values.normalize_catalog_background ? '1' : '0');
          hasChanges = true;
        }

        if (!hasChanges) {
          message.info('No changes detected');
          return;
        }

        await updateProduct({ id: String(editingProduct.id), data: formData }).unwrap();
        message.success('Product updated successfully');
      } else {
        /* ---- CREATE: send all fields ---- */
        formData.append('name', values.name);
        formData.append('price', String(values.price));
        if (values.stylist_price !== undefined && values.stylist_price !== null) {
          formData.append('stylist_price', String(values.stylist_price));
        }
        formData.append('stylist_only', values.stylist_only ? '1' : '0');
        formData.append('quantity', String(values.quantity));
        formData.append('category_id', String(values.category_id));
        formData.append('brand_id', String(values.brand_id));
        formData.append('translations[en]', values.description_en ?? '');
        formData.append('translations[mk]', values.description_mk ?? '');
        formData.append('translations[shq]', values.description_shq ?? '');

        // Handle image upload
        if (fileList.length > 0 && fileList[0].originFileObj) {
          const optimizedFile = await convertToWebP(fileList[0].originFileObj as File, 0.82);
          formData.append('image', optimizedFile, optimizedFile.name);
          formData.append('normalize_catalog_background', values.normalize_catalog_background ? '1' : '0');
        }

        await createProduct(formData).unwrap();
        message.success('Product created successfully');
      }

      setModalOpen(false);
      setEditingProduct(null);
      setFileList([]);
      form.resetFields();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.message || 'Failed to save product');
    }
  };

  /** Upload props — prevent automatic upload, keep single file in state. */
  const uploadProps: UploadProps = {
    beforeUpload: () => false,
    fileList,
    onChange: ({ fileList: newList }) => setFileList(newList.slice(-1)),
    accept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
    maxCount: 1,
    listType: 'picture-card',
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
        record.stylistOnly
          ? <Tag color="purple">STYLIST ONLY</Tag>
          : <Tag>ALL USERS</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Product) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  /* ============================== render ============================== */

  const isEditing = !!editingProduct;
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
            setFileList([]);
            form.resetFields();
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
          <Col xs={24} md={12}>
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

          <Col xs={24} md={12} style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

      <Modal
        title={isEditing ? 'Edit Product' : 'Add Product'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={isCreating || isUpdating}
        onCancel={() => {
          setModalOpen(false);
          setEditingProduct(null);
          setFileList([]);
          form.resetFields();
        }}
        width={700}
        forceRender
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Product Name" rules={[{ required: !isEditing, message: 'Please enter product name' }]}>
            <Input placeholder="Product name" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brand_id" label="Brand" rules={[{ required: !isEditing, message: 'Please select a brand' }]}>
                <Select placeholder="Select brand">
                  {brands.map((b) => (
                    <Select.Option key={b.id} value={Number(b.id)}>{b.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category_id" label="Category" rules={[{ required: !isEditing, message: 'Please select a category' }]}>
                <Select placeholder="Select category">
                  {categories.map((c) => (
                    <Select.Option key={c.id} value={Number(c.id)}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="price" label="Price (MKD)" rules={[{ required: !isEditing, message: 'Please enter price' }]}>
                <InputNumber min={0} prefix="MKD" placeholder="0.00" style={{ width: '100%' }} precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="stylist_price"
                label="Stylist Price (MKD)"
                extra={!isEditing ? 'Auto-calculated as 90% of price if empty' : undefined}
              >
                <InputNumber min={0} prefix="MKD" placeholder="0.00" style={{ width: '100%' }} precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="quantity" label="Stock Qty" rules={[{ required: !isEditing, message: 'Please enter quantity' }]}>
                <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stylist_only" label="Stylist Only" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="description_en" label="Description (English)">
                <Input.TextArea rows={3} placeholder="English product description" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description_mk" label="Description (Macedonian)">
                <Input.TextArea rows={3} placeholder="Македонски опис" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description_shq" label="Description (Albanian)">
                <Input.TextArea rows={3} placeholder="Pershkrimi ne shqip" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Product Image"
            extra="Images are automatically converted to WebP. Check the box below if you want this upload matched to the catalog pink background. Max 10MB."
          >
            <Upload {...uploadProps}>
              {fileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
            {isEditing && editingProduct.image && fileList.length === 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Current image:</Text>
                <br />
                <img
                  src={editingProduct.image}
                  alt="Current"
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, marginTop: 4 }}
                />
              </div>
            )}
            <Form.Item
              name="normalize_catalog_background"
              valuePropName="checked"
              noStyle
            >
              <Checkbox style={{ marginTop: 12 }}>
                Match existing catalog background for this upload
              </Checkbox>
            </Form.Item>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

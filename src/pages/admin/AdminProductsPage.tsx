'use client';

import { useState, useCallback, useEffect } from 'react';
import { Typography, Table, Button, Tag, Input, Space, Card, Form, InputNumber, Select, Upload, Row, Col, App, Modal, Switch } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useGetProductsQuery, useGetCategoriesQuery, useGetBrandsQuery } from '@/features/products/api';
import { 
  useCreateProductMutation, 
  useUpdateProductMutation, 
  useDeleteProductMutation,
  useUpdateProductStockMutation
} from '@/features/admin/api';
import type { Product } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/shared/utils/formatPrice';
import { convertToWebP } from '@/shared/utils/imageUtils';

const { Title, Text } = Typography;

/** The fields the backend actually accepts (matching controller validation). */
interface ProductFormValues {
  name: string;
  price: number;
  stylist_price?: number;
  stylist_only?: boolean;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm<ProductFormValues>();

  const debouncedSearch = useDebounce(search, 300);
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  const { data, isLoading, refetch } = useGetProductsQuery({
    page,
    perPage: 20,
    search: searchQuery,
  });

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [_updateStock] = useUpdateProductStockMutation();

  useEffect(() => {
    if (!modalOpen) return;

    if (editingProduct) {
      form.setFieldsValue(snapshotFromProduct(editingProduct));
      return;
    }

    form.setFieldsValue({
      stylist_only: false,
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
            src={record.image || "/placeholder.svg"}
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Products</Title>
          <Text type="secondary">{data?.meta?.total || 0} products in catalog</Text>
        </div>
        <Space>
          <Input
            placeholder="Search products (min 2 chars)..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 200 }}
            allowClear
          />
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
        </Space>
      </div>

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
            pageSize: 20,
            total: data?.meta?.total || 0,
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

          <Form.Item label="Product Image" extra="Images are automatically converted to WebP for optimization. Max 10MB.">
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
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

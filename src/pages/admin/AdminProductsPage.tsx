'use client';

import { useState } from 'react';
import { Typography, Table, Button, Tag, Input, Space, Card, Form, InputNumber, Select, Upload, Row, Col, Switch, App, Modal } from 'antd';
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

const { Title, Text } = Typography;

export default function AdminProductsPage() {
  const { modal, message } = App.useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const debouncedSearch = useDebounce(search, 300);
  
  // Only search if 2+ characters
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;
  
  const { data, isLoading, refetch } = useGetProductsQuery({
    page,
    perPage: 20,
    search: searchQuery,
  });

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();

  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [updateStock] = useUpdateProductStockMutation();

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      name: product.name,
      brand_id: product.brandId || (product.brand as any)?.id,
      category_id: product.categoryId || (product.category as any)?.id,
      description: product.description,
      price: product.price,
      compare_at_price: product.compareAtPrice,
      quantity: product.quantity,
      featured: product.featured || false,
      tags: product.tags || [],
    });
    setModalOpen(true);
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

  const _handleStockUpdate = (productId: string | number, quantity: number) => {
    modal.confirm({
      title: 'Update Stock',
      content: `Set stock to ${quantity} units?`,
      onOk: async () => {
        try {
          await updateStock({ id: String(productId), quantity, operation: 'set' }).unwrap();
          message.success('Stock updated successfully');
        } catch (error: any) {
          message.error(error?.data?.message || 'Failed to update stock');
        }
      },
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();
      
      // Map form fields to backend snake_case names
      const fieldMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        price: 'price',
        compare_at_price: 'compare_at_price',
        quantity: 'quantity',
        category_id: 'category_id',
        brand_id: 'brand_id',
      };

      Object.entries(fieldMap).forEach(([formKey, apiKey]) => {
        if (values[formKey] !== undefined && values[formKey] !== null) {
          formData.append(apiKey, String(values[formKey]));
        }
      });

      // Boolean must be sent as '1'/'0' for Laravel validation
      formData.append('featured', values.featured ? '1' : '0');

      // Handle tags array
      if (values.tags && values.tags.length > 0) {
        values.tags.forEach((tag: string, i: number) => {
          formData.append(`tags[${i}]`, tag);
        });
      }

      // Handle image uploads
      if (values.images?.fileList) {
        values.images.fileList.forEach((file: any) => {
          if (file.originFileObj) {
            formData.append('images[]', file.originFileObj);
          }
        });
      }

      if (editingProduct) {
        await updateProduct({ id: String(editingProduct.id), data: formData }).unwrap();
        message.success('Product updated successfully');
      } else {
        await createProduct(formData).unwrap();
        message.success('Product created successfully');
      }
      
      setModalOpen(false);
      setEditingProduct(null);
      form.resetFields();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.message || 'Failed to save product');
    }
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_: unknown, record: Product) => (
        <Space>
          <img
            src={record.images?.[0] || record.image || "/placeholder.svg"}
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
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

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
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProduct(null);
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
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
            <Input placeholder="Product name" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brand_id" label="Brand" rules={[{ required: true }]}>
                <Select placeholder="Select brand">
                  {brands.map((b) => (
                    <Select.Option key={b.id} value={Number(b.id)}>{b.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item name="category_id" label="Category" rules={[{ required: true }]}>
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
              <Form.Item name="price" label="Price (MKD)" rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  prefix="MKD"
                  placeholder="0.00"
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item name="compare_at_price" label="Compare Price (MKD)">
                <InputNumber
                  min={0}
                  prefix="MKD"
                  placeholder="0.00"
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="quantity" label="Stock Qty" rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  placeholder="0"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="featured" label="Featured" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Product description" />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select
              mode="tags"
              placeholder="Add tags (press Enter)"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="images" label="Product Images" extra="Upload product images (max 2MB each)">
            <Upload
              listType="picture-card"
              multiple
              maxCount={5}
              beforeUpload={() => false}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

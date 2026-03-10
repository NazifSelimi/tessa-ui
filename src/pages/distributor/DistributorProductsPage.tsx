/**
 * Distributor Products Page
 * 
 * Shows product catalog with both retail and stylist pricing.
 * Distributors can see margins and share pricing info with stylists.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Table, Button, Tag, Input, Space, Spin, Card } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { getProducts } from '@/api/services';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { Product } from '@/types';

const { Title, Text } = Typography;

export default function DistributorProductsPage() {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      try {
        const data = await getProducts();
        if (cancelled) return;
        setProducts(data.data ?? []);
      } catch (error) {
        if (!cancelled && import.meta.env.DEV) console.error('Failed to load products:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProducts();

    return () => { cancelled = true; };
  }, []);

  const getBrandName = (b: any) => typeof b === 'object' ? b?.name || '' : b || '';
  const getCategoryName = (c: any) => typeof c === 'object' ? c?.name || '' : c || '';

  const tableData = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return products
      .filter(p =>
        p.name.toLowerCase().includes(lowerSearch) ||
        getBrandName(p.brand).toLowerCase().includes(lowerSearch)
      )
      .map(product => ({
        key: `${product.id}`,
        productId: product.id,
        productName: product.name,
        brand: getBrandName(product.brand),
        category: getCategoryName(product.category),
        retailPrice: Number(product.price ?? 0),
        stylistPrice: Number(product.stylistPrice ?? 0),
        stock: product.quantity ?? 0,
        image: product.images?.[0] || product.image,
      }));
  }, [products, search]);

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_: unknown, record: typeof tableData[0]) => (
        <Space>
          <img
            src={record.image || "/placeholder.svg"}
            alt={record.productName}
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
          />
          <div>
            <Text strong>{record.productName}</Text>
            <br />
            <Text type="secondary">{record.brand}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => (
        <Tag>{(cat || '').replace('-', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Retail Price',
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      render: (price: number) => <Text>{formatPrice(price)}</Text>,
    },
    {
      title: 'Stylist Price',
      dataIndex: 'stylistPrice',
      key: 'stylistPrice',
      render: (price: number) => <Text strong style={{ color: '#16a34a' }}>{formatPrice(price)}</Text>,
    },
    {
      title: 'Margin',
      key: 'margin',
      render: (_: unknown, record: typeof tableData[0]) => {
        const margin = record.retailPrice > 0
          ? ((record.retailPrice - record.stylistPrice) / record.retailPrice * 100).toFixed(0)
          : '0';
        return <Text type="success">{margin}%</Text>;
      },
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number) => (
        stock > 10 ? (
          <Tag color="green">{stock} units</Tag>
        ) : stock > 0 ? (
          <Tag color="orange">{stock} units</Tag>
        ) : (
          <Tag color="red">Out of Stock</Tag>
        )
      ),
    },
  ];

  if (currentRole !== 'distributor' && currentRole !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Title level={4}>Access Denied</Title>
        <Text type="secondary">This page is only available for distributors.</Text>
      </div>
    );
  }

  return (
    <div>
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/distributor')}
        style={{ marginBottom: 16 }}
      >
        Back to Portal
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Product Catalog</Title>
          <Text type="secondary">View products with retail and stylist pricing</Text>
        </div>
        <Input
          placeholder="Search products..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={tableData}
            columns={columns}
            pagination={{ pageSize: 20 }}
          />
        )}
      </Card>
    </div>
  );
}

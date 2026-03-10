/**
 * Cart Page Component
 * 
 * Displays cart items with quantity controls and checkout summary.
 * Mobile-responsive with card-based layout on small screens.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Card,
  Empty,
  InputNumber,
  Space,
  Divider,
  Row,
  Col,
  Image,
  Popconfirm,
  message,
} from 'antd';
import {
  DeleteOutlined,
  ShoppingOutlined,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Title, Text, Paragraph } = Typography;

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, getItemPrice, getItemTotal, subtotal, itemCount } = useCart();

  const handleQuantityChange = (productId: string | number, quantity: number | null) => {
    if (quantity && quantity > 0) {
      updateQuantity(productId, quantity);
    }
  };

  const handleRemoveItem = (productId: string | number) => {
    removeItem(productId);
    message.success('Item removed from cart');
  };

  const handleClearCart = () => {
    clearCart();
    message.success('Cart cleared');
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const totals = { subtotal, itemCount, savings: 0 };

  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--spacing-3xl) var(--spacing-xl)' }}>
        <Empty
          image={<ShoppingOutlined style={{ fontSize: 80, color: 'var(--color-text-muted)' }} />}
          description={
            <Space direction="vertical" size={8}>
              <Title level={4} style={{ margin: 0 }}>Your cart is empty</Title>
              <Paragraph type="secondary">
                Looks like you haven't added any items to your cart yet.
                Browse our collection to find something you'll love.
              </Paragraph>
            </Space>
          }
        >
          <Link to="/">
            <Button type="primary" size="large" icon={<ShoppingOutlined />}>
              Start Shopping
            </Button>
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <div className="cart-page">
      {/* Header */}
      <div className="cart-page__header">
        <Link to="/" className="back-link">
          <ArrowLeftOutlined />
          <span>Continue Shopping</span>
        </Link>
        <div className="cart-page__title-row">
          <Title level={2} style={{ margin: 0 }}>Shopping Cart</Title>
          <Text type="secondary">{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Cart Items - Mobile Card Layout */}
        <Col xs={24} lg={16}>
          <Card className="cart-items-card">
            <div className="cart-items">
              {items.map((item, index) => (
                <React.Fragment key={`${item.productId}`}>
                  <div className="cart-item">
                    <Image
                      src={item.product.images?.[0] || item.product.image || '/placeholder.svg'}
                      alt={item.product.name}
                      width={80}
                      height={80}
                      style={{ 
                        objectFit: 'cover', 
                        borderRadius: 'var(--radius-md)',
                        flexShrink: 0,
                      }}
                      preview={false}
                      fallback="/placeholder.svg"
                    />
                    <div className="cart-item__details">
                      <div className="cart-item__info">
                        <Link to={`/product/${item.product.id}`}>
                          <Text strong className="cart-item__name">{item.product.name}</Text>
                        </Link>
                        <Text type="secondary" className="cart-item__meta">
                          {typeof item.product.brand === 'object' ? item.product.brand?.name : item.product.brand}
                        </Text>
                        <Text className="cart-item__unit-price">
                          {formatPrice(getItemPrice(item))} each
                        </Text>
                      </div>
                      
                      <div className="cart-item__actions">
                        <InputNumber
                          min={1}
                          max={item.product.quantity || 1}
                          value={item.quantity}
                          onChange={(val) => handleQuantityChange(item.productId, val)}
                          size="small"
                          style={{ width: 70 }}
                          aria-label={`Quantity for ${item.product.name}`}
                        />
                        <Text strong className="cart-item__total">
                          {formatPrice(getItemTotal(item))}
                        </Text>
                        <Popconfirm
                          title="Remove item"
                          description="Are you sure you want to remove this item?"
                          onConfirm={() => handleRemoveItem(item.productId)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            aria-label="Remove item"
                            size="small"
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                  {index < items.length - 1 && <Divider style={{ margin: 'var(--spacing-lg) 0' }} />}
                </React.Fragment>
              ))}
            </div>
            
            {/* Clear Cart */}
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Popconfirm
                title="Clear cart"
                description="Are you sure you want to remove all items?"
                onConfirm={handleClearCart}
                okText="Yes"
                cancelText="No"
              >
                <Button type="text" danger>
                  Clear Cart
                </Button>
              </Popconfirm>
            </div>
          </Card>
        </Col>

        {/* Order Summary */}
        <Col xs={24} lg={8}>
          <Card className="order-summary" style={{ position: 'sticky', top: 24 }}>
            <Title level={5} style={{ marginBottom: 'var(--spacing-lg)' }}>Order Summary</Title>
            
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div className="price-row">
                <Text type="secondary">Subtotal ({totals.itemCount} items)</Text>
                <Text>{formatPrice(totals.subtotal)}</Text>
              </div>

              {totals.savings > 0 && (
                <div className="price-row">
                  <Text type="secondary">Savings</Text>
                  <Text style={{ color: 'var(--color-success)' }}>-{formatPrice(totals.savings)}</Text>
                </div>
              )}

              <div className="price-row">
                <Text type="secondary">Shipping</Text>
                <Text>{totals.subtotal >= 3000 ? 'FREE' : formatPrice(150)}</Text>
              </div>

              <Divider style={{ margin: 'var(--spacing-sm) 0' }} />

              <div className="price-row">
                <Text strong style={{ fontSize: 'var(--font-size-lg)' }}>Estimated Total</Text>
                <Text strong style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>
                  {formatPrice(totals.subtotal + (totals.subtotal >= 3000 ? 0 : 150))}
                </Text>
              </div>

              {totals.subtotal < 3000 && (
                <div className="shipping-notice">
                  <Text style={{ color: '#d48806', fontSize: 'var(--font-size-sm)' }}>
                    Add {formatPrice(3000 - totals.subtotal)} more for FREE shipping!
                  </Text>
                </div>
              )}

              <Button
                type="primary"
                size="large"
                block
                onClick={handleCheckout}
                style={{ marginTop: 'var(--spacing-sm)', height: 48 }}
              >
                Proceed to Checkout
              </Button>

              {/* Trust Badges */}
              <Divider style={{ margin: 'var(--spacing-lg) 0 var(--spacing-sm)' }} />
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div className="trust-badge">
                  <SafetyCertificateOutlined style={{ color: 'var(--color-success)' }} />
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>Secure SSL Checkout</Text>
                </div>
                <div className="trust-badge">
                  <TruckOutlined style={{ color: 'var(--color-primary)' }} />
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>Free shipping on orders over 3.000 MKD</Text>
                </div>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CartPage;

/**
 * Checkout Page
 * 
 * Multi-step checkout process:
 * 1. Shipping information
 * 2. Payment details
 * 3. Order review
 * 
 * Includes discount code application with role-based validation.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Typography, Steps, Form, Input, Button, Card,
  Divider, Space, Image, message, Alert, Tag, Result,
} from 'antd';
import {
  ShoppingOutlined, CreditCardOutlined, CheckCircleOutlined,
  TagOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useDiscounts } from '@/hooks/useDiscounts';
import { useCreateOrderMutation } from '@/features/orders/api';
import { extractErrorMessage } from '@/shared/utils/error';
import { notifyError } from '@/shared/utils/notify';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Title, Text, Paragraph } = Typography;

interface ShippingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart, getItemTotal } = useCart();
  const { isProfessional, user } = useAuth();
  const { appliedCode, applyCode, removeCode, discountAmount, discountPercent, error: discountError, isValidating, clearError } = useDiscounts();
  const [createOrder] = useCreateOrderMutation();

  const [currentStep, setCurrentStep] = useState(0);
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const [shippingForm] = Form.useForm();

  // Auto-fill shipping form for authenticated users
  useEffect(() => {
    if (user && !shippingData) {
      shippingForm.setFieldsValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
      });
    }
  }, [user, shippingForm, shippingData]);

  // Shipping cost calculation
  const shippingCost = subtotal >= 3000 ? 0 : 150;
  const total = subtotal - discountAmount + shippingCost;

  // Empty cart check
  if (items.length === 0 && !orderComplete) {
    return (
      <div className="empty-state">
        <Title level={4}>Your cart is empty</Title>
        <Text type="secondary" className="empty-state__description">
          Add some products before checking out.
        </Text>
        <Button type="primary" onClick={() => navigate('/')}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  // Order complete state
  if (orderComplete) {
    return (
      <Result
        status="success"
        title="Order Placed Successfully!"
        subTitle="Thank you for your order. You will receive a confirmation email shortly."
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/')}>
            Continue Shopping
          </Button>,
          <Button key="orders" onClick={() => navigate('/account/orders')}>
            View Orders
          </Button>,
        ]}
      />
    );
  }

  // Handle shipping form submit
  const handleShippingSubmit = (values: ShippingFormData) => {
    setShippingData(values);
    setCurrentStep(1);
  };

  // Handle discount code application
  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    
    clearError();
    
    const success = await applyCode(discountInput.trim(), subtotal);
    
    if (success) {
      message.success('Discount code applied!');
      setDiscountInput('');
    }
  };

  // Place order
  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    try {
      if (!shippingData) {
        message.error('Shipping information is required.');
        return;
      }

      const payload = {
        items: items.map((item) => ({
          product_id: Number(item.productId),
          qty: item.quantity,
        })),
        shipping_address: {
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          email: shippingData.email,
          phone: shippingData.phone,
          address: shippingData.address,
          city: shippingData.city,
          state: shippingData.state,
          zip: shippingData.zip,
        },
        payment_method: 'cod' as const,
        custom_message: undefined,
        coupon_code: appliedCode || undefined,
      };

      await createOrder(payload).unwrap();
      clearCart();
      setOrderComplete(true);
    } catch (error: unknown) {
      notifyError(extractErrorMessage(error));
    } finally {
      setPlacingOrder(false);
    }
  };

  // Step items
  const steps = [
    { title: 'Shipping', icon: <ShoppingOutlined /> },
    { title: 'Payment', icon: <CreditCardOutlined /> },
    { title: 'Review', icon: <CheckCircleOutlined /> },
  ];

  return (
    <div className="checkout-page">
      <Title level={2} style={{ marginBottom: 'var(--spacing-xl)' }}>Checkout</Title>

      <Steps 
        current={currentStep} 
        items={steps}
        style={{ marginBottom: 'var(--spacing-2xl)' }}
        size="small"
        responsive={false}
      />

      <Row gutter={[32, 24]}>
        {/* Form Section */}
        <Col xs={24} lg={14}>
          {/* Step 1: Shipping */}
          {currentStep === 0 && (
            <Card title="Shipping Information" className="checkout-card">
              <Form
                form={shippingForm}
                layout="vertical"
                onFinish={handleShippingSubmit}
                initialValues={shippingData || undefined}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="firstName"
                      label="First Name"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="lastName"
                      label="Last Name"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[
                        { required: true, message: 'Required' },
                        { type: 'email', message: 'Invalid email' },
                      ]}
                    >
                      <Input size="large" type="email" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="phone"
                      label="Phone"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input size="large" type="tel" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="address"
                  label="Street Address"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input size="large" />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="city"
                      label="City"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Form.Item
                      name="state"
                      label="State"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Form.Item
                      name="zip"
                      label="ZIP Code"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item style={{ marginBottom: 0, marginTop: 'var(--spacing-lg)' }}>
                  <Button type="primary" htmlType="submit" size="large" block>
                    Continue to Payment
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}

          {/* Step 2: Payment */}
          {currentStep === 1 && (
            <Card title="Payment Method" className="checkout-card">
              <Alert
                message="Cash on Delivery (COD)"
                description="Payment will be collected upon delivery. No online payment is required."
                type="info"
                showIcon
                style={{ marginBottom: 'var(--spacing-xl)' }}
              />
              <Space style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}>
                <Button onClick={() => setCurrentStep(0)} size="large">
                  Back
                </Button>
                <Button type="primary" size="large" style={{ flex: 1 }} onClick={() => setCurrentStep(2)}>
                  Review Order
                </Button>
              </Space>
            </Card>
          )}

          {/* Step 3: Review */}
          {currentStep === 2 && (
            <Card title="Order Review" className="checkout-card">
              {/* Shipping Address */}
              <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Text strong style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                  Shipping Address
                </Text>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                  {shippingData?.firstName} {shippingData?.lastName}<br />
                  {shippingData?.address}<br />
                  {shippingData?.city}, {shippingData?.state} {shippingData?.zip}<br />
                  {shippingData?.email} • {shippingData?.phone}
                </Paragraph>
              </div>

              <Divider />

              {/* Payment Method */}
              <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Text strong style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                  Payment Method
                </Text>
                <Text type="secondary">
                  Cash on Delivery (COD)
                </Text>
              </div>

              <Divider />

              {/* Items */}
              <div>
                <Text strong style={{ display: 'block', marginBottom: 'var(--spacing-md)' }}>
                  Items ({items.length})
                </Text>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {items.map(item => (
                    <div 
                      key={`${item.productId}`}
                      className="checkout-item"
                    >
                      <Image
                        src={item.product.images?.[0] || item.product.image || '/placeholder.svg'}
                        alt={item.product.name}
                        width={60}
                        height={60}
                        style={{ 
                          objectFit: 'cover', 
                          borderRadius: 'var(--radius-md)',
                          flexShrink: 0,
                        }}
                        preview={false}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong ellipsis style={{ display: 'block' }}>{item.product.name}</Text>
                        <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                          {item.quantity} × {item.product.name}
                        </Text>
                      </div>
                      <Text strong>{formatPrice(getItemTotal(item))}</Text>
                    </div>
                  ))}
                </Space>
              </div>

              <Divider />

              <Space style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}>
                <Button onClick={() => setCurrentStep(1)} size="large">
                  Back
                </Button>
                <Button 
                  type="primary" 
                  size="large" 
                  onClick={handlePlaceOrder}
                  loading={placingOrder}
                  style={{ flex: 1 }}
                >
                  {placingOrder ? 'Processing...' : `Place Order • ${formatPrice(total)}`}
                </Button>
              </Space>
            </Card>
          )}
        </Col>

        {/* Order Summary Sidebar */}
        <Col xs={24} lg={10}>
          <Card className="order-summary">
            <Title level={5} style={{ marginBottom: 'var(--spacing-lg)' }}>Order Summary</Title>

            {/* Items Preview */}
            <div className="order-summary__items">
              {items.slice(0, 3).map(item => (
                <div 
                  key={`${item.productId}`}
                  className="order-summary__item"
                >
                  <Image
                    src={item.product.images?.[0] || item.product.image || '/placeholder.svg'}
                    alt={item.product.name}
                    width={48}
                    height={48}
                    style={{ 
                      objectFit: 'cover', 
                      borderRadius: 'var(--radius-sm)',
                      flexShrink: 0,
                    }}
                    preview={false}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text ellipsis style={{ fontSize: 'var(--font-size-sm)' }}>{item.product.name}</Text>
                    <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)', display: 'block' }}>
                      {item.quantity} × {item.product.name}
                    </Text>
                  </div>
                  <Text style={{ fontSize: 'var(--font-size-sm)' }}>{formatPrice(getItemTotal(item))}</Text>
                </div>
              ))}
              {items.length > 3 && (
                <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                  +{items.length - 3} more items
                </Text>
              )}
            </div>

            <Divider />

            {/* Discount Code */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <Text strong style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                Discount Code
              </Text>
              
              {appliedCode ? (
                <div className="applied-discount">
                  <Space>
                    <TagOutlined style={{ color: 'var(--color-success)' }} />
                    <Text strong style={{ color: 'var(--color-success)' }}>
                      {appliedCode}
                    </Text>
                    <Tag color="green">-{discountPercent}%</Tag>
                  </Space>
                  <Button 
                    type="text" 
                    danger 
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={removeCode}
                    aria-label="Remove discount code"
                  />
                </div>
              ) : (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Enter code"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    onPressEnter={handleApplyDiscount}
                    prefix={<TagOutlined style={{ color: 'var(--color-text-muted)' }} />}
                  />
                  <Button 
                    onClick={handleApplyDiscount}
                    loading={isValidating}
                  >
                    Apply
                  </Button>
                </Space.Compact>
              )}

              {discountError && (
                <Text type="danger" style={{ fontSize: 'var(--font-size-xs)', display: 'block', marginTop: 'var(--spacing-sm)' }}>
                  {discountError}
                </Text>
              )}

              {/* Role hint */}
              {!appliedCode && isProfessional && (
                <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)', display: 'block', marginTop: 'var(--spacing-sm)' }}>
                  You may have access to professional discount codes.
                </Text>
              )}
            </div>

            <Divider />

            {/* Price Breakdown */}
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="price-row">
                <Text type="secondary">Subtotal</Text>
                <Text>{formatPrice(subtotal)}</Text>
              </div>
              
              {discountAmount > 0 && (
                <div className="price-row">
                  <Text type="secondary">Discount ({discountPercent}%)</Text>
                  <Text style={{ color: 'var(--color-success)' }}>-{formatPrice(discountAmount)}</Text>
                </div>
              )}
              
              <div className="price-row">
                <Text type="secondary">Shipping</Text>
                <Text>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</Text>
              </div>
            </Space>

            <Divider />

            <div className="price-row" style={{ fontSize: 'var(--font-size-lg)' }}>
              <Text strong>Total</Text>
              <Text strong style={{ fontSize: 'var(--font-size-xl)' }}>{formatPrice(total)}</Text>
            </div>

            {/* Free Shipping Progress */}
            {shippingCost > 0 && (
              <Alert
                message={`Add ${formatPrice(3000 - subtotal + discountAmount)} more for free shipping`}
                type="info"
                showIcon
                style={{ marginTop: 'var(--spacing-lg)' }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

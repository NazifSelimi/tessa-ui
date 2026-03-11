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
import { ArrowLeftOutlined } from '@ant-design/icons';
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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
        <Title level={4}>{t('cart.yourCartIsEmpty')}</Title>
        <Text type="secondary" className="empty-state__description">
          {t('checkout.emptyCartCheckout')}
        </Text>
        <Button type="primary" onClick={() => navigate('/')}>
          {t('cart.continueShopping')}
        </Button>
      </div>
    );
  }

  // Order complete state
  if (orderComplete) {
    return (
      <Result
        status="success"
        title={t('checkout.orderSuccess')}
        subTitle={t('checkout.orderSuccessMessage')}
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/')}>
            {t('cart.continueShopping')}
          </Button>,
          <Button key="orders" onClick={() => navigate('/account/orders')}>
            {t('auth.myOrders')}
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
    { title: t('checkout.shipping'), icon: <ShoppingOutlined /> },
    { title: t('checkout.payment'), icon: <CreditCardOutlined /> },
    { title: t('checkout.review'), icon: <CheckCircleOutlined /> },
  ];

  return (
    <div className="checkout-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 8, padding: '4px 0' }}
      >
        {t('common.back')}
      </Button>
      <Title level={2} style={{ marginBottom: 'var(--spacing-xl)' }}>{t('checkout.title')}</Title>

      <Steps 
        current={currentStep} 
        items={steps}
        style={{ marginBottom: 'var(--spacing-2xl)' }}
        size="small"
      />

      <Row gutter={[32, 24]}>
        {/* Form Section */}
        <Col xs={24} lg={14}>
          {/* Step 1: Shipping */}
          {currentStep === 0 && (
            <Card title={t('checkout.shippingInfo')} className="checkout-card">
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
                      label={t('checkout.firstName')}
                      rules={[{ required: true, message: t('common.required') }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="lastName"
                      label={t('checkout.lastName')}
                      rules={[{ required: true, message: t('common.required') }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label={t('checkout.email')}
                      rules={[
                        { required: true, message: t('common.required') },
                        { type: 'email', message: t('auth.invalidEmail') },
                      ]}
                    >
                      <Input size="large" type="email" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="phone"
                      label={t('checkout.phone')}
                      rules={[{ required: true, message: t('common.required') }]}
                    >
                      <Input size="large" type="tel" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="address"
                  label={t('checkout.address')}
                  rules={[{ required: true, message: t('common.required') }]}
                >
                  <Input size="large" />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="city"
                      label={t('checkout.city')}
                      rules={[{ required: true, message: t('common.required') }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Form.Item
                      name="state"
                      label={t('checkout.state')}
                      rules={[{ required: true, message: t('common.required') }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Form.Item
                      name="zip"
                      label={t('checkout.zip')}
                      rules={[{ required: true, message: t('common.required') }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item style={{ marginBottom: 0, marginTop: 'var(--spacing-lg)' }}>
                  <Button type="primary" htmlType="submit" size="large" block>
                    {t('checkout.continueToPayment')}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}

          {/* Step 2: Payment */}
          {currentStep === 1 && (
            <Card title={t('checkout.paymentMethod')} className="checkout-card">
              <Alert
                message={t('checkout.cod')}
                description={t('checkout.codDescription')}
                type="info"
                showIcon
                style={{ marginBottom: 'var(--spacing-xl)' }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 'var(--spacing-lg)' }}>
                <Button onClick={() => setCurrentStep(0)} size="large">
                  {t('common.back')}
                </Button>
                <Button type="primary" size="large" style={{ flex: 1 }} onClick={() => setCurrentStep(2)}>
                  {t('checkout.reviewOrder')}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Review */}
          {currentStep === 2 && (
            <Card title={t('checkout.orderReview')} className="checkout-card">
              {/* Shipping Address */}
              <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Text strong style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                  {t('checkout.shippingAddress')}
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
                  {t('checkout.paymentMethod')}
                </Text>
                <Text type="secondary">
                  {t('checkout.cod')}
                </Text>
              </div>

              <Divider />

              {/* Items */}
              <div>
                <Text strong style={{ display: 'block', marginBottom: 'var(--spacing-md)' }}>
                  {t('checkout.items')} ({items.length})
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

              <div style={{ display: 'flex', gap: 12, marginTop: 'var(--spacing-lg)' }}>
                <Button onClick={() => setCurrentStep(1)} size="large">
                  {t('common.back')}
                </Button>
                <Button 
                  type="primary" 
                  size="large" 
                  onClick={handlePlaceOrder}
                  loading={placingOrder}
                  style={{ flex: 1 }}
                >
                  {placingOrder ? t('checkout.processing') : `${t('checkout.placeOrder')} • ${formatPrice(total)}`}
                </Button>
              </div>
            </Card>
          )}
        </Col>

        {/* Order Summary Sidebar */}
        <Col xs={24} lg={10}>
          <Card className="order-summary">
            <Title level={5} style={{ marginBottom: 'var(--spacing-lg)' }}>{t('checkout.orderSummary')}</Title>

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
                  +{items.length - 3} {t('checkout.moreItems')}
                </Text>
              )}
            </div>

            <Divider />

            {/* Discount Code */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <Text strong style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                {t('checkout.discountCode')}
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
                    aria-label={t('checkout.removeDiscount')}
                  />
                </div>
              ) : (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder={t('checkout.enterCode')}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    onPressEnter={handleApplyDiscount}
                    prefix={<TagOutlined style={{ color: 'var(--color-text-muted)' }} />}
                  />
                  <Button 
                    onClick={handleApplyDiscount}
                    loading={isValidating}
                  >
                    {t('checkout.apply')}
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
                  {t('checkout.professionalHint')}
                </Text>
              )}
            </div>

            <Divider />

            {/* Price Breakdown */}
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="price-row">
                <Text type="secondary">{t('cart.subtotal')}</Text>
                <Text>{formatPrice(subtotal)}</Text>
              </div>
              
              {discountAmount > 0 && (
                <div className="price-row">
                  <Text type="secondary">{t('checkout.discount')} ({discountPercent}%)</Text>
                  <Text style={{ color: 'var(--color-success)' }}>-{formatPrice(discountAmount)}</Text>
                </div>
              )}
              
              <div className="price-row">
                <Text type="secondary">{t('checkout.shippingCost')}</Text>
                <Text>{shippingCost === 0 ? t('checkout.free') : formatPrice(shippingCost)}</Text>
              </div>
            </Space>

            <Divider />

            <div className="price-row" style={{ fontSize: 'var(--font-size-lg)' }}>
              <Text strong>{t('checkout.total')}</Text>
              <Text strong style={{ fontSize: 'var(--font-size-xl)' }}>{formatPrice(total)}</Text>
            </div>

            {/* Free Shipping Progress */}
            {shippingCost > 0 && (
              <Alert
                message={`${t('checkout.addMoreForFreeShipping', { amount: formatPrice(3000 - subtotal + discountAmount) })}`}
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

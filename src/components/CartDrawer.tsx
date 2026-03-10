/**
 * Cart Drawer Component
 * 
 * Slide-out cart panel that shows:
 * - Cart items with images
 * - Quantity controls
 * - Subtotal
 * - Checkout/View Cart buttons
 */

import { useNavigate } from 'react-router-dom';
import { Drawer, Button, Typography, Space, InputNumber, Empty, Divider, Badge } from 'antd';
import { DeleteOutlined, ShoppingOutlined, CloseOutlined } from '@ant-design/icons';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Text } = Typography;

export default function CartDrawer() {
  const navigate = useNavigate();
  const { 
    items, 
    isDrawerOpen, 
    closeDrawer, 
    updateQuantity, 
    removeItem,
    itemCount,
    subtotal,
    getItemPrice,
    getItemTotal,
  } = useCart();

  const handleCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  const handleViewCart = () => {
    closeDrawer();
    navigate('/cart');
  };

  return (
    <Drawer
      title={
        <Space>
          <ShoppingOutlined />
          <span>Shopping Cart</span>
          <Badge 
            count={itemCount} 
            style={{ backgroundColor: 'var(--color-primary)' }} 
          />
        </Space>
      }
      placement="right"
      open={isDrawerOpen}
      onClose={closeDrawer}
      width={400}
      closeIcon={<CloseOutlined />}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column' },
        footer: { borderTop: '1px solid var(--color-border-light)' },
      }}
      footer={
        items.length > 0 ? (
          <div style={{ padding: 'var(--spacing-lg) 0' }}>
            {/* Subtotal */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: 'var(--spacing-lg)',
              padding: '0 var(--spacing-xl)',
            }}>
              <Text style={{ fontSize: 'var(--font-size-lg)' }}>Subtotal</Text>
              <Text strong style={{ fontSize: 'var(--font-size-xl)' }}>
                {formatPrice(subtotal)}
              </Text>
            </div>
            
            <Text 
              type="secondary" 
              style={{ 
                display: 'block', 
                fontSize: 'var(--font-size-xs)', 
                textAlign: 'center',
                marginBottom: 'var(--spacing-lg)',
                padding: '0 var(--spacing-xl)',
              }}
            >
              Shipping calculated at checkout
            </Text>
            
            {/* Action Buttons */}
            <Space direction="vertical" style={{ width: '100%', padding: '0 var(--spacing-xl)' }} size="small">
              <Button 
                type="primary" 
                block 
                size="large" 
                onClick={handleCheckout}
                style={{ height: 48 }}
              >
                Checkout
              </Button>
              <Button block onClick={handleViewCart}>
                View Cart
              </Button>
            </Space>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="cart-drawer__empty">
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={12}>
                <Text type="secondary">Your cart is empty</Text>
                <Button type="primary" onClick={() => { closeDrawer(); navigate('/'); }}>
                  Start Shopping
                </Button>
              </Space>
            }
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '0 var(--spacing-xl)' }}>
          {items.map((item, index) => {
            const price = getItemPrice(item);
            const total = getItemTotal(item);
            const imageUrl = (item.product.images && item.product.images[0]) || item.product.image || '/placeholder.svg';
            
            return (
              <div key={`${item.productId}`}>
                <div className="cart-drawer__item">
                  {/* Product Image */}
                  <img
                    src={imageUrl}
                    alt={item.product.name}
                    className="cart-drawer__item-image"
                    loading="lazy"
                  />
                  
                  {/* Product Details */}
                  <div className="cart-drawer__item-details">
                    <Text 
                      strong 
                      style={{ 
                        display: 'block',
                        marginBottom: 'var(--spacing-xs)',
                        lineHeight: 1.3,
                      }}
                      ellipsis
                    >
                      {item.product.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {typeof item.product.brand === 'object' ? item.product.brand?.name : item.product.brand}
                    </Text>
                    
                    {/* Price & Quantity Row */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: 'var(--spacing-md)',
                    }}>
                      <InputNumber
                        min={1}
                        max={item.product.quantity || 1}
                        value={item.quantity}
                        onChange={(val) => updateQuantity(item.productId, val || 1)}
                        size="small"
                        style={{ width: 70 }}
                        aria-label={`Quantity for ${item.product.name}`}
                      />
                      <Space size="middle">
                        <Text strong>{formatPrice(total)}</Text>
                        <Button 
                          type="text" 
                          danger 
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(item.productId)}
                          aria-label={`Remove ${item.product.name} from cart`}
                          style={{ padding: 4 }}
                        />
                      </Space>
                    </div>
                    
                    {/* Unit Price */}
                    <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                      {formatPrice(price)} each
                    </Text>
                  </div>
                </div>
                
                {index < items.length - 1 && <Divider style={{ margin: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

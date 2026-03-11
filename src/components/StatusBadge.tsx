/**
 * Status Badge Component
 * 
 * Displays status indicators for orders, payments, etc.
 * Provides consistent styling across the application.
 */

import { Tag } from 'antd';
import type { OrderStatus, PaymentStatus, StylistRequestStatus, CouponStatus } from '@/types';

// Order status colors and labels
const orderStatusConfig: Record<OrderStatus, { color: string; label: string }> = {
  pending: { color: 'orange', label: 'Pending' },
  confirmed: { color: 'blue', label: 'Confirmed' },
  shipped: { color: 'purple', label: 'Shipped' },
  cancelled: { color: 'red', label: 'Cancelled' },
};

// Payment status colors and labels
const paymentStatusConfig: Record<PaymentStatus, { color: string; label: string }> = {
  pending: { color: 'orange', label: 'Pending' },
  paid: { color: 'green', label: 'Paid' },
  failed: { color: 'red', label: 'Failed' },
  refunded: { color: 'default', label: 'Refunded' },
  partially_refunded: { color: 'gold', label: 'Partial Refund' },
};

// Stylist request status colors and labels
const stylistRequestStatusConfig: Record<StylistRequestStatus, { color: string; label: string }> = {
  pending: { color: 'orange', label: 'Pending Review' },
  approved: { color: 'green', label: 'Approved' },
};

// Coupon status colors and labels
const couponStatusConfig: Record<CouponStatus, { color: string; label: string }> = {
  active: { color: 'green', label: 'Active' },
  inactive: { color: 'default', label: 'Inactive' },
  expired: { color: 'red', label: 'Expired' },
  scheduled: { color: 'blue', label: 'Scheduled' },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = orderStatusConfig[status] || { color: 'default', label: status };
  return (
    <Tag color={config.color} style={{ textTransform: 'uppercase', fontWeight: 500, fontSize: 11 }}>
      {config.label}
    </Tag>
  );
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = paymentStatusConfig[status] || { color: 'default', label: status };
  return (
    <Tag color={config.color} style={{ fontWeight: 500, fontSize: 11 }}>
      {config.label}
    </Tag>
  );
}

interface StylistRequestStatusBadgeProps {
  status: StylistRequestStatus;
}

export function StylistRequestStatusBadge({ status }: StylistRequestStatusBadgeProps) {
  const config = stylistRequestStatusConfig[status] || { color: 'default', label: status };
  return (
    <Tag color={config.color} style={{ fontWeight: 500 }}>
      {config.label}
    </Tag>
  );
}

interface CouponStatusBadgeProps {
  status: CouponStatus;
}

export function CouponStatusBadge({ status }: CouponStatusBadgeProps) {
  const config = couponStatusConfig[status] || { color: 'default', label: status };
  return (
    <Tag color={config.color} style={{ fontWeight: 500 }}>
      {config.label}
    </Tag>
  );
}

// Stock status badge
interface StockBadgeProps {
  stock: number;
  lowStockThreshold?: number;
}

export function StockBadge({ stock, lowStockThreshold = 10 }: StockBadgeProps) {
  if (stock === 0) {
    return <Tag color="red">Out of Stock</Tag>;
  }
  if (stock <= lowStockThreshold) {
    return <Tag color="orange">Low Stock ({stock})</Tag>;
  }
  return <Tag color="green">{stock} in stock</Tag>;
}

// Role badge
import type { UserRole } from '@/types';

const roleConfig: Record<UserRole, { color: string; label: string }> = {
  guest: { color: 'default', label: 'Guest' },
  user: { color: 'blue', label: 'User' },
  stylist: { color: 'purple', label: 'Stylist' },
  distributor: { color: 'gold', label: 'Distributor' },
  admin: { color: 'red', label: 'Admin' },
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role] || { color: 'default', label: role };
  return (
    <Tag color={config.color} style={{ fontWeight: 500, textTransform: 'capitalize' }}>
      {config.label}
    </Tag>
  );
}

// Generic status badge
interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment' | 'stylist' | 'coupon';
}

export default function StatusBadge({ status, type = 'order' }: StatusBadgeProps) {
  switch (type) {
    case 'order':
      return <OrderStatusBadge status={status as OrderStatus} />;
    case 'payment':
      return <PaymentStatusBadge status={status as PaymentStatus} />;
    case 'stylist':
      return <StylistRequestStatusBadge status={status as StylistRequestStatus} />;
    case 'coupon':
      return <CouponStatusBadge status={status as CouponStatus} />;
    default:
      return <Tag>{status}</Tag>;
  }
}

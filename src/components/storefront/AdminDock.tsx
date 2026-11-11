import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ADMIN_PATH_FEATURE, useFeatureStates } from '@/features/admin/platformApi';
import { BarChart3, MessageCircle, Contact, ClipboardList, FlaskConical, Gift, Images, Mail, Megaphone, SlidersHorizontal, Building2, LayoutTemplate, Package, QrCode, Share2, Shield, Tag, Truck, UserCheck, Users, X } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3 },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/catalog-images', label: 'Photos', icon: Images },
  { to: '/admin/customers', label: 'Customers', icon: Contact },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/stylist-requests', label: 'Business applications', icon: UserCheck },
  { to: '/admin/stylist-invitations', label: 'Business invitations', icon: QrCode },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/admin/referrals', label: 'Referral codes', icon: Share2 },
  { to: '/admin/emails', label: 'Emails', icon: Mail },
  { to: '/admin/messages', label: 'Viber & WhatsApp', icon: MessageCircle },
  { to: '/admin/bundles', label: 'Offers & bundles', icon: Gift },
  { to: '/admin/studio', label: 'Post Studio', icon: Megaphone },
  { to: '/admin/content-blocks', label: 'Page sections', icon: LayoutTemplate },
  { to: '/admin/hair-quiz', label: 'Hair quiz', icon: FlaskConical },
  { to: '/admin/distributors', label: 'Distributors', icon: Truck },
  { to: '/admin/business', label: 'Business profile', icon: Building2 },
  { to: '/admin/features', label: 'Features', icon: SlidersHorizontal },
];

/** Floating admin menu on every storefront page, so admins reach any admin tool while browsing the shop. */
export default function AdminDock() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const features = useFeatureStates();
  const visibleLinks = links.filter(({ to }) => !ADMIN_PATH_FEATURE[to] || (features?.[ADMIN_PATH_FEATURE[to]]?.enabled !== false && features?.[ADMIN_PATH_FEATURE[to]]?.included !== false));

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return <div className="nl-admin-dock">
    {open && <nav className="nl-admin-dock__menu" aria-label="Admin tools">
      {visibleLinks.map(({ to, label, icon: Icon }) => <Link key={to} to={to}><Icon size={16} />{label}</Link>)}
    </nav>}
    <button type="button" className="nl-admin-dock__toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? <X size={17} /> : <Shield size={17} />}Admin
    </button>
  </div>;
}

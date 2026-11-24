import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_PATH_FEATURE, useFeatureStates } from '@/features/admin/platformApi';
import { BarChart3, FileSpreadsheet, FileText, TrendingUp, MessageCircle, Contact, ClipboardList, FlaskConical, Gift, Images, Mail, Megaphone, SlidersHorizontal, Building2, LayoutTemplate, Package, QrCode, Share2, Shield, Tag, Truck, UserCheck, Users, X } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3 },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/import', label: 'Excel import', icon: FileSpreadsheet },
  { to: '/admin/catalog-images', label: 'Photos', icon: Images },
  { to: '/admin/customers', label: 'Customers', icon: Contact },
  { to: '/admin/documents', label: 'PDF documents', icon: FileText },
  { to: '/admin/reports', label: 'Sales reports', icon: TrendingUp },
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

/** Floating admin menu on every storefront page, so admins reach any admin tool while browsing the shop,
 * plus a Customer/Stylist switch that shows the storefront the way each kind of account sees it. */
export default function AdminDock() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isStylistPreview, switchView } = useAuth();
  const features = useFeatureStates();
  const showView = (view: 'customer' | 'stylist') => {
    switchView(view);
    navigate(view === 'stylist' ? '/stylist/workspace' : '/');
  };
  const visibleLinks = links.filter(({ to }) => !ADMIN_PATH_FEATURE[to] || (features?.[ADMIN_PATH_FEATURE[to]]?.enabled !== false));

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return <div className="nl-admin-dock">
    {open && <nav className="nl-admin-dock__menu" aria-label="Admin tools">
      {visibleLinks.map(({ to, label, icon: Icon }) => <Link key={to} to={to}><Icon size={16} />{label}</Link>)}
    </nav>}
    <div className="nl-admin-dock__bar">
      <div className="nl-admin-dock__view" role="group" aria-label="View the shop as">
        <button type="button" aria-pressed={!isStylistPreview} onClick={() => showView('customer')}>Customer</button>
        <button type="button" aria-pressed={isStylistPreview} onClick={() => showView('stylist')}>Stylist</button>
      </div>
      <button type="button" className="nl-admin-dock__toggle" aria-label="Admin" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={17} /> : <Shield size={17} />}<span className="nl-admin-dock__label">Admin</span>
      </button>
    </div>
  </div>;
}

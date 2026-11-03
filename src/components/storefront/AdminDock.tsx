import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, ClipboardList, FlaskConical, Gift, Images, LayoutTemplate, Package, QrCode, Share2, Shield, Tag, Truck, UserCheck, Users, X } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3 },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/catalog-images', label: 'Photos', icon: Images },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/stylist-requests', label: 'Stylist requests', icon: UserCheck },
  { to: '/admin/stylist-invitations', label: 'Stylist invitations', icon: QrCode },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/admin/referrals', label: 'Stylist referrals', icon: Share2 },
  { to: '/admin/bundles', label: 'Offers & bundles', icon: Gift },
  { to: '/admin/content-blocks', label: 'Page sections', icon: LayoutTemplate },
  { to: '/admin/hair-quiz', label: 'Hair quiz', icon: FlaskConical },
  { to: '/admin/distributors', label: 'Distributors', icon: Truck },
];

/** Floating admin menu on every storefront page, so admins reach any admin tool while browsing the shop. */
export default function AdminDock() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return <div className="nl-admin-dock">
    {open && <nav className="nl-admin-dock__menu" aria-label="Admin tools">
      {links.map(({ to, label, icon: Icon }) => <Link key={to} to={to}><Icon size={16} />{label}</Link>)}
    </nav>}
    <button type="button" className="nl-admin-dock__toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? <X size={17} /> : <Shield size={17} />}Admin
    </button>
  </div>;
}

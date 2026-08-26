import { Link } from 'react-router-dom';
import { Button, Card, Col, Row, Typography } from 'antd';
import { ThunderboltOutlined, ExperimentOutlined, GiftOutlined, FileTextOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import BundleDealRail from '@/components/BundleDealRail';
import { useCart } from '@/hooks/useCart';

const { Title, Text } = Typography;

export default function StylistWorkspacePage() {
  const { t } = useTranslation();
  const { itemCount } = useCart();

  return <div className="stylist-workspace">
    <section className="stylist-workspace__hero">
      <Title>{t('stylistWorkspace.title')}</Title>
      <Text>{t('stylistWorkspace.subtitle')}</Text>
      <Link to="/stylist/quick-order?restock=colors"><Button type="primary" size="large" icon={<ThunderboltOutlined />}>{t('stylistWorkspace.quickColorRestockAction')}</Button></Link>
    </section>
    <section className="stylist-workspace__actions" aria-label="Stylist shortcuts">
      <Link to="/stylist/quick-order"><ThunderboltOutlined /><span>{t('stylistWorkspace.quickOrderAction')}</span></Link>
      <Link to="/cart"><ShoppingCartOutlined /><span>{t('stylistWorkspace.resumeCart')} {itemCount > 0 ? `(${itemCount})` : ''}</span></Link>
      <button type="button" onClick={() => document.getElementById('salon-offers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><GiftOutlined /><span>{t('stylistWorkspace.browseOffers')}</span></button>
      <Link to="/account/orders"><FileTextOutlined /><span>{t('stylistWorkspace.myOrders')}</span></Link>
    </section>
    <Row gutter={[16, 16]}>
      <Col xs={24} md={10}><Card className="stylist-workspace__restock"><ThunderboltOutlined /><Title level={3}>{t('stylistWorkspace.quickColorRestockTitle')}</Title><Text>{t('stylistWorkspace.quickColorRestockCopy')}</Text><Link to="/stylist/quick-order?restock=colors"><Button type="primary" size="large">{t('stylistWorkspace.quickColorRestockAction')}</Button></Link></Card></Col>
      <Col xs={24} md={14}><Card className="stylist-workspace__guide"><ExperimentOutlined /><Title level={3}>{t('stylistWorkspace.pairingTitle')}</Title><ul><li>{t('stylistWorkspace.oro')}</li><li>{t('stylistWorkspace.noYellow')}</li><li>{t('stylistWorkspace.fanola')}</li><li>{t('stylistWorkspace.hydrogen')}</li></ul></Card></Col>
    </Row>
    <div className="stylist-workspace__offers" id="salon-offers"><Title level={3}>{t('stylistWorkspace.offersTitle')}</Title><Text type="secondary">{t('stylistWorkspace.offersCopy')}</Text><BundleDealRail /></div>
  </div>;
}

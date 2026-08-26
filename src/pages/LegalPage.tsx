import { Card, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { site } from '@/shared/config/site';

const { Paragraph, Title } = Typography;

export default function LegalPage() {
  const isPrivacy = useLocation().pathname === '/privacy';

  return (
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 64px' }}>
      <Card>
        <Title level={1}>{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</Title>
        <Paragraph type="secondary">Last updated: 26 August 2026</Paragraph>
        {isPrivacy ? <>
          <Title level={3}>How we use your information</Title>
          <Paragraph>We use the information you provide to create your account, process and deliver orders, provide support, and meet legal obligations. We do not sell personal information.</Paragraph>
          <Title level={3}>Your choices</Title>
          <Paragraph>You may ask to access, correct, or delete your account information by contacting us. Some order and tax records may need to be retained where required by law.</Paragraph>
        </> : <>
          <Title level={3}>Orders and delivery</Title>
          <Paragraph>Orders are subject to product availability and confirmation. {site.deliverySummary}</Paragraph>
          <Title level={3}>Professional products</Title>
          <Paragraph>Stylist-only and technical products are intended for qualified professionals. Always follow the current manufacturer instructions and safety guidance.</Paragraph>
          <Title level={3}>Returns and support</Title>
          <Paragraph>For order support or return questions, contact Tessa before returning a product so we can provide the correct instructions.</Paragraph>
        </>}
        <Title level={3}>Contact</Title>
        <Paragraph><a href={site.contactPhoneHref}>{site.contactPhone}</a><br /><a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></Paragraph>
      </Card>
    </section>
  );
}

import { Card, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { site } from '@/shared/config/site';

const { Paragraph, Title } = Typography;

export default function LegalPage() {
  const isPrivacy = useLocation().pathname === '/privacy';
  const title = isPrivacy ? 'Privacy policy' : 'Terms of service';

  return (
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 64px' }}>
      <Card>
        <Title level={1}>{title}</Title>
        <Paragraph type="secondary">Status on 26 August 2026: approved legal copy has not yet been supplied for this route.</Paragraph>
        <Paragraph>
          This page intentionally remains reachable so public legal links do not redirect back to the homepage during release validation.
        </Paragraph>
        <Paragraph>
          Do not promote this release to production until approved {isPrivacy ? 'privacy-policy' : 'terms-of-service'} content is provided and reviewed.
        </Paragraph>
        <Title level={3}>Contact</Title>
        <Paragraph>
          {site.contactPhones.map((phone) => (
            <span key={phone.href}>
              <a href={phone.href}>{phone.label}</a>
              <br />
            </span>
          ))}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
        </Paragraph>
      </Card>
    </section>
  );
}

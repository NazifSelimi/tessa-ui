import { Card, Divider, Space, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { site } from '@/shared/config/site';
import Seo from '@/shared/components/Seo';
import { getLegalDocument, type LegalPageKey } from '@/shared/content/legal';

const { Paragraph, Title } = Typography;

export default function LegalPage() {
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const candidate = location.pathname.split('/').filter(Boolean).at(-1) ?? 'privacy';
  const page: LegalPageKey = ['privacy', 'terms', 'returns', 'delivery', 'contact'].includes(candidate)
    ? candidate as LegalPageKey
    : 'privacy';
  const document = getLegalDocument(i18n.resolvedLanguage ?? i18n.language, page);
  const isContact = page === 'contact';

  const organizationSchema = isContact ? {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.legalName ?? site.name,
    url: site.url,
    email: site.contactEmail,
    telephone: site.contactPhones[0].href.replace('tel:', ''),
    ...(site.address ? { address: site.address } : {}),
  } : undefined;

  return (
    <>
      <Seo
        title={document.title}
        description={document.description}
        path={`/${page}`}
        structuredData={organizationSchema}
      />
      <section style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 64px' }}>
        <Card>
          <Title level={1}>{document.title}</Title>
          <Paragraph type="secondary">{t('legal.lastUpdated')}</Paragraph>
          <Paragraph style={{ fontSize: 16 }}>{document.intro}</Paragraph>
          <Divider />
          {document.sections.map((section) => (
            <section key={section.heading} style={{ marginBottom: 28 }}>
              <Title level={2} style={{ fontSize: 22 }}>{section.heading}</Title>
              {section.paragraphs.map((paragraph) => <Paragraph key={paragraph}>{paragraph}</Paragraph>)}
            </section>
          ))}
        <Title level={3}>Contact</Title>
        <Space direction="vertical" size={4}>
          {site.legalName && <Paragraph style={{ margin: 0 }}>{site.legalName}</Paragraph>}
          {site.address && <Paragraph style={{ margin: 0 }}>{site.address}</Paragraph>}
          {site.contactPhones.map((phone) => (
            <a key={phone.href} href={phone.href}>{phone.label}</a>
          ))}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
        </Space>
        </Card>
      </section>
    </>
  );
}

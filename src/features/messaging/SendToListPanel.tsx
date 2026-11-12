/**
 * "Send to a list": choose who, choose a message, then go down the list one
 * person at a time and press send in WhatsApp / Viber. Built for the phone.
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Empty, Flex, Input, InputNumber, List, Popconfirm, Progress, Select, Space, Tag, Typography } from 'antd';
import {
  CheckOutlined, CopyOutlined, DownloadOutlined, MessageOutlined, ReloadOutlined, StepForwardOutlined, UndoOutlined, WhatsAppOutlined,
} from '@ant-design/icons';
import { viberUrl, whatsappUrl } from '@/shared/utils/messaging';
import { apiErrorMessage, useGetAudienceMutation, type AudienceSegment } from './api';
import {
  createCampaign, loadCampaign, mark, nextOpen, progress, saveCampaign, toCsv, type Campaign, type Recipient,
} from './campaign';
import { copyText } from './MessageButtons';
import { fillTemplate, firstName, LANGS, toLang, type Lang } from './templates';
import { useMessageTemplates } from './useMessageTemplates';

const { Text, Paragraph } = Typography;

const GROUPS: { value: AudienceSegment; label: string }[] = [
  { value: 'all', label: 'Everyone (customers + business)' },
  { value: 'customers', label: 'Customers (incl. guest buyers)' },
  { value: 'business', label: 'Business accounts' },
  { value: 'recent_buyers', label: 'Ordered in the last N days' },
  { value: 'inactive_buyers', label: 'Ordered before, not in the last N days' },
  { value: 'numbers', label: 'Paste numbers' },
];

const TYPE_COLOR: Record<string, string> = { business: 'gold', customer: 'blue', guest: 'default', pasted: 'purple' };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SendToListPanel() {
  const { message } = App.useApp();
  const { templates, find, shop, link } = useMessageTemplates();
  const [fetchAudience, { isLoading }] = useGetAudienceMutation();
  const [campaign, setCampaign] = useState<Campaign | null>(loadCampaign);

  const [segment, setSegment] = useState<AudienceSegment>('customers');
  const [days, setDays] = useState(90);
  const [numbers, setNumbers] = useState('');
  const [templateKey, setTemplateKey] = useState('offer');
  const [language, setLanguage] = useState<Lang | 'auto'>('auto');
  const [code, setCode] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { saveCampaign(campaign); }, [campaign]);

  const textFor = useMemo(() => (row: Recipient, c: Pick<Campaign, 'templateKey' | 'language' | 'code'>) => {
    const template = find(c.templateKey);
    if (!template) return '';
    const lang = c.language === 'auto' ? toLang(row.locale) : c.language;
    return fillTemplate(template[lang], { name: firstName(row.name), shop, link, code: c.code });
  }, [find, shop, link]);

  const build = async () => {
    try {
      const rows = await fetchAudience({ segment, days, numbers: segment === 'numbers' ? numbers : undefined }).unwrap();
      if (rows.length === 0) {
        message.warning('Nobody with a phone number in this group.');
        return;
      }
      const label = GROUPS.find((g) => g.value === segment)?.label.replace('N days', `${days} days`) ?? segment;
      setCampaign(createCampaign({ groupLabel: label, templateKey, language, code, rows }));
    } catch (error) {
      message.error(apiErrorMessage(error, 'Could not load the list'));
    }
  };

  // ---- Step 1: choose who and what -------------------------------------------------
  if (!campaign) {
    const sample: Recipient = { phone: '38970123456', name: 'Ana Petrovska', type: 'customer', lastOrderAt: null, orders: 1, locale: language === 'auto' ? 'mk' : language, userId: null };
    const placeholdersUsed = find(templateKey)?.mk ?? '';
    return (
      <Flex vertical gap={16} style={{ maxWidth: 640 }}>
        <Alert type="info" showIcon message="Free: the shop sends nothing by itself. You go down the list and press send in your own WhatsApp or Viber." />
        <div>
          <Text strong>1. Who</Text>
          <Select value={segment} onChange={setSegment} options={GROUPS} style={{ width: '100%', marginTop: 6 }} size="large" />
          {(segment === 'recent_buyers' || segment === 'inactive_buyers') && (
            <Space style={{ marginTop: 8 }}>
              <Text>N =</Text>
              <InputNumber min={1} max={3650} value={days} onChange={(v) => setDays(Number(v) || 90)} size="large" />
              <Text>days</Text>
            </Space>
          )}
          {segment === 'numbers' && (
            <Input.TextArea
              style={{ marginTop: 8 }}
              rows={6}
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              placeholder={'One per line, a name is optional:\n078 123 456, Ana\n070 555 444 Arta'}
            />
          )}
        </div>
        <div>
          <Text strong>2. Message</Text>
          <Select
            value={templateKey}
            onChange={setTemplateKey}
            options={templates.map((t) => ({ value: t.key, label: t.label }))}
            style={{ width: '100%', marginTop: 6 }}
            size="large"
          />
          <Space wrap style={{ marginTop: 8 }}>
            <Select
              value={language}
              onChange={setLanguage}
              style={{ minWidth: 220 }}
              options={[{ value: 'auto', label: "Each person's language (else MK)" }, ...LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))]}
            />
            {placeholdersUsed.includes('{code}') && (
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code for {code}" style={{ width: 180 }} />
            )}
          </Space>
        </div>
        <Card size="small" title="Preview">
          <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{textFor(sample, { templateKey, language, code })}</Paragraph>
        </Card>
        <Button type="primary" size="large" block loading={isLoading} onClick={() => void build()} disabled={segment === 'numbers' && !numbers.trim()}>
          Make the list
        </Button>
      </Flex>
    );
  }

  // ---- Step 2: one person at a time -------------------------------------------------
  const stats = progress(campaign);
  const finished = campaign.index >= campaign.rows.length;
  const current = finished ? null : campaign.rows[campaign.index];
  const text = current ? textFor(current, campaign) : '';
  const template = find(campaign.templateKey);

  const setStatus = (phone: string, status: 'sent' | 'skipped' | null) => setCampaign((c) => (c ? mark(c, phone, status) : c));
  const exportCsv = () => download(`messages-${campaign.createdAt.slice(0, 10)}.csv`, toCsv(campaign, (row) => textFor(row, campaign)));

  return (
    <Flex vertical gap={12} style={{ maxWidth: 640 }}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <div>
          <Text strong>{campaign.groupLabel}</Text>
          <br />
          <Text type="secondary">{template?.label ?? campaign.templateKey} · {campaign.language === 'auto' ? 'own language' : campaign.language.toUpperCase()}</Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={exportCsv}>CSV</Button>
          <Popconfirm title="Start a new list? This list's progress is forgotten." onConfirm={() => setCampaign(null)} okText="New list">
            <Button icon={<ReloadOutlined />}>New list</Button>
          </Popconfirm>
        </Space>
      </Flex>

      <Progress percent={Math.round((stats.done / Math.max(1, stats.total)) * 100)} format={() => `${stats.done}/${stats.total}`} />
      <Text type="secondary">{stats.sent} sent · {stats.skipped} skipped · {stats.total - stats.done} left</Text>

      {current ? (
        <Card
          title={<Space wrap><span>{current.name || 'No name'}</span><Tag color={TYPE_COLOR[current.type]}>{current.type}</Tag></Space>}
          extra={<Text type="secondary">{campaign.index + 1} / {campaign.rows.length}</Text>}
        >
          <Text copyable={{ text: `+${current.phone}` }}>+{current.phone}</Text>
          {current.lastOrderAt && <Text type="secondary"> · last order {current.lastOrderAt.slice(0, 10)} · {current.orders} orders</Text>}
          <Paragraph style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 8, marginTop: 12 }}>{text}</Paragraph>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Button size="large" href={whatsappUrl(current.phone, text)} target="_blank" rel="noopener noreferrer" icon={<WhatsAppOutlined />} style={{ color: '#128c4b', borderColor: '#25d366' }}>
              Open WhatsApp
            </Button>
            <Button size="large" href={viberUrl(current.phone, text)} onClick={() => void copyText(text)} icon={<MessageOutlined />} style={{ color: '#7360f2', borderColor: '#7360f2' }}>
              Open Viber
            </Button>
            <Button size="large" icon={<StepForwardOutlined />} onClick={() => setStatus(current.phone, 'skipped')}>Skip</Button>
            <Button size="large" type="primary" icon={<CheckOutlined />} onClick={() => setStatus(current.phone, 'sent')}>Mark sent</Button>
          </div>
          <Button type="link" icon={<CopyOutlined />} onClick={() => void copyText(text).then((ok) => ok && message.info('Message copied'))} style={{ paddingLeft: 0, marginTop: 4 }}>
            Copy text
          </Button>
        </Card>
      ) : (
        <Alert type="success" showIcon message="Everyone on this list is done." description="Export the CSV to keep a record, or start a new list." />
      )}

      <Button type="link" onClick={() => setShowAll((v) => !v)} style={{ alignSelf: 'flex-start', paddingLeft: 0 }}>
        {showAll ? 'Hide the full list' : 'Show the full list'}
      </Button>
      {showAll && (
        campaign.rows.length === 0 ? <Empty /> : (
          <List
            size="small"
            bordered
            dataSource={campaign.rows}
            pagination={campaign.rows.length > 50 ? { pageSize: 50, size: 'small' } : false}
            renderItem={(row, i) => {
              const status = campaign.status[row.phone];
              return (
                <List.Item
                  onClick={() => setCampaign((c) => (c ? { ...c, index: i } : c))}
                  style={{ cursor: 'pointer', background: i === campaign.index ? 'rgba(22,119,255,0.06)' : undefined }}
                  actions={status ? [<Button key="undo" size="small" type="text" icon={<UndoOutlined />} onClick={(e) => { e.stopPropagation(); setStatus(row.phone, null); }} aria-label="Undo" />] : []}
                >
                  <Space wrap size={4}>
                    <Text>{row.name || '—'}</Text>
                    <Text type="secondary">+{row.phone}</Text>
                    {status && <Tag color={status === 'sent' ? 'green' : 'default'}>{status}</Tag>}
                  </Space>
                </List.Item>
              );
            }}
          />
        )
      )}
      {!finished && stats.done > 0 && nextOpen(campaign, 0) < campaign.index && (
        <Text type="secondary">Some earlier people are still open; they come again at the end.</Text>
      )}
    </Flex>
  );
}

/**
 * Optional automatic WhatsApp (Meta Cloud API). Premium plan only, OFF by
 * default; Meta bills per message. Setup steps: tessa-api docs/WHATSAPP_SETUP.md.
 */

import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Flex, Input, InputNumber, Result, Spin, Switch, Table, Tag, Typography } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import {
  apiErrorMessage, isFeatureOff, useGetWhatsAppSettingsQuery, useSaveWhatsAppSettingsMutation, useSendWhatsAppTestMutation,
  type StatusTemplate,
} from './api';

const { Text, Paragraph } = Typography;

export function PremiumBadge() {
  return <Tag icon={<CrownOutlined />} color="gold">Premium</Tag>;
}

export function CostNote() {
  return (
    <Alert
      type="warning"
      showIcon
      message="Meta charges for each automatic message"
      description={(
        <>
          Every template message WhatsApp delivers is billed to your Meta account (order updates are cheaper
          "utility" messages, offers are "marketing" and cost more; roughly a few euro cents each, check the
          current price list on developers.facebook.com/docs/whatsapp/pricing). Free: replies within 24 hours
          after a customer writes to you. Nothing is sent while the switch below is off. The Viber / WhatsApp
          buttons elsewhere stay free.
        </>
      )}
    />
  );
}

export default function WhatsAppAutoPanel() {
  const { message } = App.useApp();
  const { data, isLoading, error } = useGetWhatsAppSettingsQuery();
  const [saveSettings, { isLoading: saving }] = useSaveWhatsAppSettingsMutation();
  const [sendTest, { isLoading: testing }] = useSendWhatsAppTestMutation();

  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [apiVersion, setApiVersion] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [testNumber, setTestNumber] = useState('');
  const [statusTemplates, setStatusTemplates] = useState<Record<string, StatusTemplate>>({});
  const [testTo, setTestTo] = useState('');
  const [testTemplate, setTestTemplate] = useState('');

  useEffect(() => {
    if (!data) return;
    setPhoneNumberId(data.phoneNumberId);
    setBusinessAccountId(data.businessAccountId);
    setApiVersion(data.apiVersion);
    setTestNumber(data.testNumber);
    setStatusTemplates(data.statusTemplates);
  }, [data]);

  if (isLoading) return <Spin />;
  if (isFeatureOff(error)) {
    return (
      <Result
        icon={<CrownOutlined style={{ color: '#d4a106' }} />}
        title="Automatic WhatsApp is a Premium feature"
        subTitle="Upgrade to Premium to send order updates on WhatsApp automatically. The free Viber / WhatsApp buttons and Send to a list work on every plan."
      />
    );
  }
  if (!data) return <Alert type="error" message={apiErrorMessage(error, 'Could not load the WhatsApp settings')} />;

  const save = async (extra: { enabled?: boolean; clearToken?: boolean } = {}) => {
    try {
      await saveSettings({ phoneNumberId, businessAccountId, apiVersion, testNumber, statusTemplates, accessToken: accessToken || undefined, ...extra }).unwrap();
      setAccessToken('');
      message.success(extra.enabled === true ? 'Automatic messages are ON' : extra.enabled === false ? 'Automatic messages are OFF' : 'Saved');
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not save'));
    }
  };

  const test = async () => {
    try {
      await sendTest({ to: testTo, template: testTemplate || undefined }).unwrap();
      message.success('Test message sent. Check WhatsApp on that phone.');
    } catch (e) {
      message.error(apiErrorMessage(e, 'Test failed'));
    }
  };

  const setTemplate = (status: string, patch: Partial<StatusTemplate>) =>
    setStatusTemplates((all) => ({ ...all, [status]: { ...(all[status] ?? { name: '', language: 'mk', params: 0 }), ...patch } }));

  return (
    <Flex vertical gap={16} style={{ maxWidth: 760 }}>
      <Flex align="center" gap={8} wrap>
        <Text strong style={{ fontSize: 16 }}>Automatic WhatsApp</Text>
        <PremiumBadge />
        <Tag color={data.enabled ? 'green' : 'default'}>{data.enabled ? 'ON' : 'OFF'}</Tag>
      </Flex>
      <CostNote />
      {!data.isProduction && (
        <Alert type="info" showIcon message="Test server: automatic messages only go to the test number below, never to customers." />
      )}

      <Card size="small" title="1. Connect your Meta (WhatsApp Cloud API) account">
        <Paragraph type="secondary">Step-by-step guide: WHATSAPP_SETUP.md (ask whoever set up the shop). All values are on Meta's WhatsApp → API Setup page.</Paragraph>
        <Flex vertical gap={8}>
          <Input addonBefore="Phone number ID" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
          <Input.Password
            addonBefore="Access token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={data.hasToken ? 'Saved (hidden). Type a new one to replace it.' : 'Paste the permanent token'}
            autoComplete="off"
          />
          <Input addonBefore="Business account ID (optional)" value={businessAccountId} onChange={(e) => setBusinessAccountId(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
          <Input addonBefore="API version" value={apiVersion} onChange={(e) => setApiVersion(e.target.value.trim())} style={{ maxWidth: 260 }} />
          <Input addonBefore="Test number" value={testNumber} onChange={(e) => setTestNumber(e.target.value)} placeholder="078 123 456" style={{ maxWidth: 320 }} />
        </Flex>
      </Card>

      <Card size="small" title="2. Approved templates for each order status">
        <Paragraph type="secondary">
          Type the exact template name from WhatsApp Manager. The shop fills {'{{1}}'} = first name, {'{{2}}'} = order number,
          {' {{3}}'} = total. Leave a name empty to send nothing for that status.
        </Paragraph>
        <Table
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={data.statuses}
          scroll={{ x: 520 }}
          columns={[
            { title: 'Status', dataIndex: 'label' },
            {
              title: 'Template name',
              render: (_: unknown, row: { key: string }) => (
                <Input value={statusTemplates[row.key]?.name ?? ''} placeholder="e.g. order_shipped" onChange={(e) => setTemplate(row.key, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
              ),
            },
            {
              title: 'Language',
              width: 90,
              render: (_: unknown, row: { key: string }) => (
                <Input value={statusTemplates[row.key]?.language ?? 'mk'} onChange={(e) => setTemplate(row.key, { language: e.target.value.trim() })} />
              ),
            },
            {
              title: 'Values',
              width: 80,
              render: (_: unknown, row: { key: string }) => (
                <InputNumber min={0} max={3} value={statusTemplates[row.key]?.params ?? 0} onChange={(v) => setTemplate(row.key, { params: Number(v) || 0 })} />
              ),
            },
          ]}
        />
      </Card>

      <Flex gap={8} wrap>
        <Button type="primary" loading={saving} onClick={() => void save()}>Save</Button>
        {data.hasToken && <Button danger onClick={() => void save({ clearToken: true })}>Remove token</Button>}
      </Flex>

      <Card size="small" title="3. Send a test">
        <Paragraph type="secondary">Sends one real message (Meta may bill it). With no template it uses Meta's ready-made "hello_world" (English).</Paragraph>
        <Flex gap={8} wrap>
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Your phone, e.g. 078 123 456" style={{ maxWidth: 240 }} />
          <Input value={testTemplate} onChange={(e) => setTestTemplate(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="Template (optional)" style={{ maxWidth: 220 }} />
          <Button loading={testing} disabled={!data.connected || !testTo.trim()} onClick={() => void test()}>Send test</Button>
        </Flex>
        {!data.connected && <Text type="secondary">Save the phone number ID and token first.</Text>}
      </Card>

      <Card size="small" title="4. Switch on">
        <Flex align="center" gap={12}>
          <Switch checked={data.enabled} disabled={!data.connected} loading={saving} onChange={(on) => void save({ enabled: on })} />
          <Text>{data.enabled ? 'Customers get WhatsApp messages automatically when an order changes status.' : 'Off: no automatic messages, no cost.'}</Text>
        </Flex>
      </Card>

      {data.recent.length > 0 && (
        <Card size="small" title="Last automatic messages">
          <Table
            size="small"
            pagination={false}
            rowKey={(r) => `${r.at}-${r.order}`}
            dataSource={data.recent}
            scroll={{ x: 480 }}
            columns={[
              { title: 'When', dataIndex: 'at', render: (v: string) => v.slice(0, 16).replace('T', ' ') },
              { title: 'Order', dataIndex: 'order', render: (v: number) => `#${v}` },
              { title: 'Status', dataIndex: 'status' },
              { title: 'Result', render: (_: unknown, r) => (r.ok ? <Tag color="green">sent</Tag> : <Text type="danger">{r.error}</Text>) },
            ]}
          />
        </Card>
      )}
    </Flex>
  );
}

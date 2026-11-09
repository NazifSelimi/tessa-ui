/**
 * Email centre: every email the shop sends (with the "not sent" list and
 * retry), writing emails to one person or a group, the automatic emails, and
 * connecting the business's own mailbox.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, App, Badge, Button, Card, Col, Descriptions, Empty, Form, Input, InputNumber, Modal, Radio, Row, Segmented, Select,
  Space, Statistic, Switch, Table, Tabs, Tag, Tooltip, Typography,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EyeOutlined, ImportOutlined, MailOutlined, ReloadOutlined,
  SendOutlined, SettingOutlined, SyncOutlined,
} from '@ant-design/icons';
import { useGetAllProductsQuery } from '@/features/admin/api';
import {
  useDeleteEmailLogMutation, useGetEmailAudienceMutation, useGetEmailCampaignsQuery, useGetEmailLogQuery, useGetEmailLogsQuery,
  useGetEmailOverviewQuery, useGetEmailSettingsQuery, useGetEmailTemplatePreviewQuery, useGetEmailTemplatesQuery,
  useImportLegacyEmailsMutation, usePreviewEmailMutation, useRetryAllFailedEmailsMutation, useRetryEmailMutation,
  useSendEmailMutation, useSendTestEmailMutation, useUpdateEmailSettingsMutation, useFeature, useLazyGetDeliverabilityQuery,
  type ComposePayload, type EmailLogRow, type EmailSegment, type EmailSettingsUpdate,
} from '@/features/admin/platformApi';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_TAG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  sent: { color: 'green', label: 'Sent', icon: <CheckCircleOutlined /> },
  queued: { color: 'blue', label: 'Waiting', icon: <SyncOutlined spin /> },
  retrying: { color: 'orange', label: 'Retrying', icon: <SyncOutlined /> },
  failed: { color: 'red', label: 'Not sent', icon: <CloseCircleOutlined /> },
};

const TYPE_LABEL: Record<string, string> = {
  'order-confirmation': 'Order confirmation',
  'order-status': 'Order status',
  'admin-new-order': 'New order alert',
  'admin-stylist-request': 'Application alert',
  'stylist-status': 'Business account',
  'password-reset': 'Password reset',
  'admin-message': 'Written by admin',
  test: 'Test',
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

function EmailFrame({ html, height = 560 }: { html: string | null | undefined; height?: number }) {
  if (!html) return <Empty description="Nothing to show" />;
  return <iframe title="Email preview" className="email-frame" sandbox="" srcDoc={html} style={{ height }} />;
}

/* ================================================================= Outbox */

function Outbox() {
  const { message, modal } = App.useApp();
  const [status, setStatus] = useState<string>('not_sent');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<string | null>(null);
  const { data: overview } = useGetEmailOverviewQuery(undefined, { pollingInterval: 30_000 });
  const { data, isFetching, refetch } = useGetEmailLogsQuery({ status: status || undefined, search: search || undefined, page });
  const { data: detail, isFetching: loadingDetail } = useGetEmailLogQuery(viewing ?? '', { skip: !viewing });
  const [retry] = useRetryEmailMutation();
  const [remove] = useDeleteEmailLogMutation();
  const [retryAll, { isLoading: retryingAll }] = useRetryAllFailedEmailsMutation();
  const [importLegacy, { isLoading: importing }] = useImportLegacyEmailsMutation();

  const columns = [
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: unknown, row: EmailLogRow) => {
        const meta = STATUS_TAG[row.status] ?? STATUS_TAG.queued;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={meta.color} icon={meta.icon}>{meta.label}</Tag>
            {row.delivery === 'log' && row.status === 'sent' && <Tooltip title="Sending is off or this is the test server: only written to the log"><Tag>log only</Tag></Tooltip>}
            {row.delivery === 'redirected' && <Tooltip title={`Test server: went to ${row.redirectedTo}`}><Tag color="purple">to test address</Tag></Tooltip>}
          </Space>
        );
      },
    },
    {
      title: 'Email',
      key: 'email',
      render: (_: unknown, row: EmailLogRow) => (
        <div>
          <Text strong>{row.subject ?? '(no subject)'}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>
            {TYPE_LABEL[row.type] ?? row.type}{row.orderId ? ` · order #${row.orderId}` : ''}{row.campaign ? ` · ${row.campaign}` : ''}
          </Text></div>
          {row.error && row.status !== 'sent' && <div className="email-error">{row.error}</div>}
        </div>
      ),
    },
    { title: 'To', key: 'to', render: (_: unknown, row: EmailLogRow) => <div><div>{row.toName ?? ''}</div><Text type="secondary" style={{ fontSize: 12 }}>{row.to}</Text></div> },
    { title: 'When', key: 'when', width: 170, render: (_: unknown, row: EmailLogRow) => <Text style={{ fontSize: 12 }}>{when(row.sentAt ?? row.createdAt)}{row.attempts > 1 ? <><br />{row.attempts} tries</> : null}</Text> },
    {
      title: '',
      key: 'actions',
      width: 170,
      render: (_: unknown, row: EmailLogRow) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(row.id)}>View</Button>
          {row.canRetry && (
            <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={() => retry(row.id).unwrap().then(() => message.success('Queued again'), () => message.error('Retry failed'))}>
              Retry
            </Button>
          )}
          <Tooltip title="Remove from the outbox">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remove" onClick={() => modal.confirm({
              title: 'Remove this email from the outbox?', content: 'It is not sent again; the record disappears.', okText: 'Remove', okButtonProps: { danger: true },
              onOk: () => remove(row.id).unwrap(),
            })} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const counts = overview?.counts;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {overview && (
        <Alert
          type={overview.delivery === 'smtp' ? 'success' : 'warning'}
          showIcon
          message={overview.deliveryNote}
          description={overview.delivery !== 'smtp' ? 'Customers do not receive emails until a mailbox is connected (Settings tab).' : undefined}
        />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Not sent" value={overview?.notSent ?? 0} valueStyle={{ color: (overview?.notSent ?? 0) > 0 ? '#b42318' : undefined }} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Sent today" value={overview?.sentToday ?? 0} suffix={overview ? `/ ${overview.dailyLimit}` : undefined} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Sent this month" value={overview?.sentThisMonth ?? 0} suffix={overview?.monthlyLimit ? `/ ${overview.monthlyLimit}` : undefined} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Unsubscribed people" value={overview?.optedOut ?? 0} /></Card></Col>
      </Row>
      {(overview?.legacyFailed ?? 0) > 0 && (
        <Alert
          type="error"
          showIcon
          message={`${overview?.legacyFailed} older email(s) failed before the outbox existed`}
          description="Move them here to see who missed them and send them again."
          action={<Button icon={<ImportOutlined />} loading={importing} onClick={async () => {
            const result = await importLegacy().unwrap();
            message.success(`${result.imported} moved into the outbox${result.skipped.length ? `, ${result.skipped.length} could not be read` : ''}`);
          }}>Move into outbox</Button>}
        />
      )}
      <Card size="small">
        <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Segmented
              value={status}
              onChange={(value) => { setStatus(String(value)); setPage(1); }}
              options={[
                { value: 'not_sent', label: <Badge count={overview?.notSent ?? 0} size="small" offset={[8, -2]}>Not sent</Badge> },
                { value: 'sent', label: 'Sent' },
                { value: '', label: 'All' },
              ]}
            />
            <Input.Search allowClear placeholder="Email, name, subject or order #" onSearch={(value) => { setSearch(value); setPage(1); }} style={{ width: 280 }} />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
            {(counts?.failed ?? 0) > 0 && (
              <Button type="primary" danger loading={retryingAll} onClick={async () => {
                const result = await retryAll().unwrap();
                message.success(`${result.queued} email(s) queued again`);
              }}>Retry all not sent ({counts?.failed})</Button>
            )}
          </Space>
        </Space>
        <Table
          rowKey="id"
          size="middle"
          loading={isFetching}
          columns={columns}
          dataSource={data?.data ?? []}
          scroll={{ x: 820 }}
          locale={{ emptyText: status === 'not_sent' ? 'Every email was sent. 🎉' : 'No emails yet' }}
          pagination={{ current: page, total: data?.meta?.total ?? 0, pageSize: data?.meta?.per_page ?? 25, onChange: setPage, showSizeChanger: false }}
        />
      </Card>
      <Modal open={viewing !== null} onCancel={() => setViewing(null)} footer={null} width={760} title={detail?.subject ?? 'Email'} destroyOnHidden>
        {detail && (
          <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="To">{detail.toName ? `${detail.toName} <${detail.to}>` : detail.to}</Descriptions.Item>
            <Descriptions.Item label="Status">{STATUS_TAG[detail.status]?.label}{detail.sentAt ? ` · ${when(detail.sentAt)}` : ''}</Descriptions.Item>
            {detail.error && detail.status !== 'sent' && <Descriptions.Item label="Error"><span className="email-error">{detail.error}</span></Descriptions.Item>}
          </Descriptions>
        )}
        {loadingDetail ? <Card loading /> : <EmailFrame html={detail?.html} />}
      </Modal>
    </Space>
  );
}

/* ================================================================= Compose */

const SEGMENTS: { value: EmailSegment; label: string; hint: string }[] = [
  { value: 'emails', label: 'Specific addresses', hint: 'Type one or more email addresses' },
  { value: 'customers', label: 'All customers', hint: 'Registered customers who did not unsubscribe' },
  { value: 'business', label: 'All business accounts', hint: 'Approved professional / wholesale accounts (business prices on product cards)' },
  { value: 'all', label: 'Customers + business accounts', hint: 'Everyone registered who did not unsubscribe' },
  { value: 'recent_buyers', label: 'Recent buyers', hint: 'Ordered in the last N days' },
  { value: 'inactive_buyers', label: 'Win back', hint: 'Ordered before, but nothing in the last N days' },
];

const IDEAS: { label: string; subject: string; heading: string; body: string; segment: EmailSegment }[] = [
  { label: 'New stock', segment: 'all', subject: 'New products just arrived', heading: 'Fresh on the shelves', body: 'Hi {name},\n\nNew products just arrived and some are limited. Have a look before they are gone.' },
  { label: 'Business offer', segment: 'business', subject: 'This week only for business accounts', heading: 'Your business price, even better', body: 'Hi {name},\n\nThis week we have a special offer for business accounts. Order before Sunday.\n\n**Free delivery** on every business order this week.' },
  { label: 'We miss you', segment: 'inactive_buyers', subject: 'We miss you, here is something for you', heading: 'It has been a while', body: 'Hi {name},\n\nWe have new products you may like. Come back and see what is new.' },
];

function Compose() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<ComposePayload>();
  const [params, setParams] = useSearchParams();
  const values = Form.useWatch([], form) as ComposePayload | undefined;
  const { data: catalogue } = useGetAllProductsQuery({ perPage: 1000, sort: 'name_asc' });
  const [getAudience, { data: audience, isLoading: counting }] = useGetEmailAudienceMutation();
  const [preview, { data: previewData, isLoading: previewing }] = usePreviewEmailMutation();
  const [send, { isLoading: sending }] = useSendEmailMutation();
  const { data: settings } = useGetEmailSettingsQuery();

  // Prefill from an order (?to=) or from an AI assistant draft (?draft=base64 JSON).
  useEffect(() => {
    const to = params.get('to');
    const draft = params.get('draft');
    if (to) form.setFieldsValue({ segment: 'emails', emails: to });
    if (draft) {
      try {
        const parsed = JSON.parse(decodeURIComponent(escape(atob(draft))));
        form.setFieldsValue({
          segment: parsed.audience ?? 'customers', subject: parsed.subject, heading: parsed.heading, body: parsed.body,
          product_ids: parsed.product_ids,
        });
        message.info('Draft from your AI assistant loaded. Check it, then send.');
      } catch {
        message.error('The draft link is damaged.');
      }
    }
    if (to || draft) {
      params.delete('to');
      params.delete('draft');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const segment = values?.segment ?? 'emails';
  const needsDays = segment === 'recent_buyers' || segment === 'inactive_buyers';

  // Recount the audience whenever who-gets-it changes.
  useEffect(() => {
    if (!values?.segment) return;
    const timer = setTimeout(() => {
      getAudience({ segment: values.segment, days: values.days, emails: values.emails });
    }, 350);
    return () => clearTimeout(timer);
  }, [values?.segment, values?.days, values?.emails, getAudience]);

  // Live preview, a little after typing stops.
  useEffect(() => {
    if (!values?.segment) return;
    const timer = setTimeout(() => {
      preview({ ...values, segment: values.segment });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), preview]);

  const productOptions = useMemo(() => (catalogue?.data ?? []).map((product) => ({
    value: Number(product.id),
    label: `${product.name}${Number(product.price) > 0 ? ` · ${formatPrice(product.price)}` : ''}`,
  })), [catalogue]);

  const submit = (payload: ComposePayload) => {
    const count = audience?.count ?? 0;
    modal.confirm({
      title: `Send “${payload.subject}” to ${count} ${count === 1 ? 'person' : 'people'}?`,
      content: (
        <div>
          <p>{audience?.label}</p>
          {settings && !settings.isProduction && <p><strong>Test server:</strong> {settings.effective}</p>}
          {audience && count > audience.leftToday && <p>Only {audience.leftToday} can go today; the rest are sent automatically over the next days.</p>}
        </div>
      ),
      okText: 'Send',
      onOk: async () => {
        try {
          const result = await send(payload).unwrap();
          message.success(result.spreadDays > 0
            ? `Sending to ${result.recipients}, spread over ${result.spreadDays + 1} days to stay inside the daily limit. Follow it in the Outbox.`
            : `Sending to ${result.recipients}. Follow it in the Outbox.`);
          form.resetFields(['subject', 'heading', 'body', 'button_text', 'button_url', 'product_ids']);
        } catch (error: any) {
          message.error(error?.data?.message ?? 'Could not send');
        }
      },
    });
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={11}>
        <Card size="small" title="Write an email">
          <Space wrap style={{ marginBottom: 12 }}>
            <Text type="secondary">Ideas:</Text>
            {IDEAS.map((idea) => (
              <Button key={idea.label} size="small" onClick={() => form.setFieldsValue({ segment: idea.segment, subject: idea.subject, heading: idea.heading, body: idea.body })}>
                {idea.label}
              </Button>
            ))}
          </Space>
          <Form form={form} layout="vertical" initialValues={{ segment: 'emails', days: 90 }} onFinish={submit} requiredMark={false}>
            <Form.Item name="segment" label="Who gets it">
              <Radio.Group className="email-segments">
                {SEGMENTS.map((item) => (
                  <Radio.Button key={item.value} value={item.value}><strong>{item.label}</strong><small>{item.hint}</small></Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
            {segment === 'emails' && (
              <Form.Item name="emails" label="Email addresses" rules={[{ required: true, message: 'Type at least one address' }]}>
                <TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="ana@example.com, marko@example.com" />
              </Form.Item>
            )}
            {needsDays && (
              <Form.Item name="days" label="Days">
                <InputNumber min={1} max={3650} addonAfter="days" />
              </Form.Item>
            )}
            <Alert
              style={{ marginBottom: 16 }}
              type={(audience?.count ?? 0) > 0 ? 'info' : 'warning'}
              showIcon
              message={counting ? 'Counting…' : `${audience?.count ?? 0} ${audience?.count === 1 ? 'person' : 'people'} will get it`}
              description={(
                <>
                  {audience?.sample?.length ? <div>e.g. {audience.sample.join(', ')}</div> : null}
                  {audience && audience.count > audience.leftToday && (
                    <div><strong>Your mailbox can send {audience.leftToday} more today (limit {audience.dailyLimit}/day).</strong> The rest go out automatically over the next {Math.ceil((audience.count - audience.leftToday) / Math.max(1, audience.dailyLimit))} day(s).</div>
                  )}
                </>
              )}
            />
            <Form.Item name="subject" label="Subject" rules={[{ required: true, message: 'Write a subject' }]}><Input maxLength={190} showCount /></Form.Item>
            <Form.Item name="heading" label="Big title inside (optional)"><Input maxLength={190} /></Form.Item>
            <Form.Item name="body" label="Text" rules={[{ required: true, message: 'Write the text' }]} extra="Blank line = new paragraph · {name} = first name · **bold** · links become clickable">
              <TextArea autoSize={{ minRows: 6, maxRows: 16 }} maxLength={10000} />
            </Form.Item>
            <Form.Item name="product_ids" label="Show products (optional, up to 8)">
              <Select mode="multiple" showSearch allowClear maxCount={8} optionFilterProp="label" options={productOptions} placeholder="Search products…" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={10}><Form.Item name="button_text" label="Button text"><Input maxLength={60} placeholder="Shop now" /></Form.Item></Col>
              <Col span={14}><Form.Item name="button_url" label="Button link" rules={[{ type: 'url', message: 'Start with https://' }]}><Input placeholder="https://…" /></Form.Item></Col>
            </Row>
            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={sending} disabled={(audience?.count ?? 0) === 0} size="large">
              Send to {audience?.count ?? 0}
            </Button>
            <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
              Group emails carry an unsubscribe link and skip people who unsubscribed. Order emails are never affected.
            </Paragraph>
          </Form>
        </Card>
      </Col>
      <Col xs={24} xl={13}>
        <Card size="small" title={<Space>Preview {previewData?.sampleRecipient && <Text type="secondary" style={{ fontWeight: 400 }}>as {previewData.sampleRecipient}</Text>}</Space>} loading={previewing && !previewData}>
          <EmailFrame html={previewData?.html} height={720} />
        </Card>
      </Col>
    </Row>
  );
}

function Campaigns() {
  const { data = [], isFetching } = useGetEmailCampaignsQuery();
  return (
    <Card size="small">
      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data}
        locale={{ emptyText: 'No emails written yet' }}
        columns={[
          { title: 'Subject', dataIndex: 'subject', render: (subject: string, row) => <div><Text strong>{subject}</Text><div><Text type="secondary" style={{ fontSize: 12 }}>{row.audience}</Text></div></div> },
          { title: 'People', dataIndex: 'recipients', width: 90 },
          {
            title: 'Result', key: 'result', width: 260, render: (_: unknown, row) => (
              <Space size={4} wrap>
                <Tag color="green">{row.sent} sent</Tag>
                {row.pending > 0 && <Tag color="blue">{row.pending} waiting</Tag>}
                {row.failed > 0 && <Tag color="red">{row.failed} not sent</Tag>}
              </Space>
            ),
          },
          { title: 'When', dataIndex: 'createdAt', width: 180, render: (value: string | null, row) => <Text style={{ fontSize: 12 }}>{when(value)}{row.createdBy ? <><br />{row.createdBy}</> : null}</Text> },
        ]}
      />
    </Card>
  );
}

/* ============================================================ Automatic */

function AutomaticEmails() {
  const { message } = App.useApp();
  const { data: templates = [] } = useGetEmailTemplatesQuery();
  const [updateSettings] = useUpdateEmailSettingsMutation();
  const [selected, setSelected] = useState('order_confirmation');
  const [locale, setLocale] = useState('mk');
  const { data: preview, isFetching, error } = useGetEmailTemplatePreviewQuery({ key: selected, locale });

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={9}>
        <Card size="small" title="Emails sent automatically">
          {templates.map((template) => (
            <div key={template.key} className={`admin-feature-row email-template-row${selected === template.key ? ' is-selected' : ''}`}>
              <button type="button" onClick={() => setSelected(template.key)}>
                <Text strong={selected === template.key}>{template.label}</Text>
              </button>
              {template.switchable ? (
                <Switch
                  checked={template.enabled}
                  onChange={(on) => updateSettings({ autoEmails: { [template.key]: on } }).unwrap()
                    .then(() => message.success(on ? 'Switched on' : 'Switched off'))}
                  aria-label={`${template.label}: ${template.enabled ? 'on' : 'off'}`}
                />
              ) : <Tag>Always on</Tag>}
            </div>
          ))}
          <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
            Customers get them in their language (Macedonian, Albanian or English); shop alerts are in English.
            Shop alerts go to the addresses in Settings.
          </Paragraph>
        </Card>
      </Col>
      <Col xs={24} xl={15}>
        <Card
          size="small"
          title={preview?.subject ?? 'Preview'}
          extra={!selected.startsWith('admin_') && (
            <Segmented size="small" value={locale} onChange={(value) => setLocale(String(value))} options={[{ value: 'mk', label: 'MK' }, { value: 'sq', label: 'SQ' }, { value: 'en', label: 'EN' }]} />
          )}
          loading={isFetching}
        >
          {error ? <Alert type="info" message={(error as any)?.data?.message ?? 'No preview yet'} /> : <EmailFrame html={preview?.html} height={680} />}
        </Card>
      </Col>
    </Row>
  );
}

/* ============================================================== Settings */

function MailboxSettings() {
  const { message } = App.useApp();
  const [form] = Form.useForm<EmailSettingsUpdate>();
  const { data: settings, isLoading } = useGetEmailSettingsQuery();
  const [save, { isLoading: saving }] = useUpdateEmailSettingsMutation();
  const [sendTest, { isLoading: testing }] = useSendTestEmailMutation();
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const mode = Form.useWatch('mode', form);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const preset = settings?.presets.find((item) => item.key === presetKey);

  useEffect(() => {
    if (!settings) return;
    form.setFieldsValue({
      mode: settings.mode, dailyLimit: settings.dailyLimit, resendKey: '', host: settings.host, port: settings.port, encryption: settings.encryption, username: settings.username,
      fromAddress: settings.fromAddress, fromName: settings.fromName, replyTo: settings.replyTo,
      adminRecipients: settings.adminRecipients, testRecipient: settings.testRecipient, password: '',
    });
  }, [settings, form]);

  const submit = async (values: EmailSettingsUpdate) => {
    const payload = { ...values };
    if (!payload.password) delete payload.password;
    if (!payload.resendKey) delete payload.resendKey;
    try {
      await save(payload).unwrap();
      form.setFieldValue('password', '');
      message.success('Saved');
    } catch (error: any) {
      message.error(error?.data?.message ?? 'Could not save');
    }
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={14}>
        <Card size="small" title={<Space><SettingOutlined /> Your mailbox</Space>} loading={isLoading}>
          {settings && <Alert style={{ marginBottom: 16 }} showIcon type={settings.effective.startsWith('Emails are delivered') ? 'success' : 'warning'} message={settings.effective} />}
          <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
            <Form.Item name="mode" label="How emails are sent">
              <Radio.Group>
                <Radio.Button value="resend">Resend (free 100/day)</Radio.Button>
                <Radio.Button value="smtp">My own mailbox</Radio.Button>
                <Radio.Button value="env">Server settings</Radio.Button>
                <Radio.Button value="off">Off (log only)</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {mode === 'resend' && (
              <>
                <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Resend sends from your verified domain (e.g. no-reply@notify.yourshop.mk). Free plan: 100 emails a day, 3,000 a month." />
                <Form.Item name="resendKey" label="Resend API key" extra={settings?.resendKeyFromServer ? 'Using the key from the server settings. Paste one to override.' : settings?.hasResendKey ? 'Saved. Leave empty to keep it.' : 'Resend → API Keys → Create (sending access).'}>
                  <Input.Password autoComplete="new-password" placeholder={settings?.hasResendKey ? '••••••••' : 're_…'} />
                </Form.Item>
              </>
            )}
            {mode === 'smtp' && (
              <>
                <Form.Item label="Quick setup">
                  <Space wrap>
                    {settings?.presets.map((item) => (
                      <Button key={item.key} type={presetKey === item.key ? 'primary' : 'default'} onClick={() => {
                        setPresetKey(item.key);
                        form.setFieldsValue({ host: item.host, port: item.port, encryption: item.encryption });
                      }}>{item.label}</Button>
                    ))}
                  </Space>
                  {preset && <Alert style={{ marginTop: 10 }} type="info" showIcon message={preset.help} />}
                </Form.Item>
                <Row gutter={12}>
                  <Col xs={24} md={12}><Form.Item name="host" label="Mail server (SMTP)" rules={[{ required: true, message: 'Enter the server' }]}><Input placeholder="smtp.gmail.com" /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="port" label="Port"><InputNumber min={1} max={65535} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="encryption" label="Security">
                      <Select options={[{ value: 'tls', label: 'TLS (587)' }, { value: 'ssl', label: 'SSL (465)' }, { value: 'none', label: 'None' }]} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}><Form.Item name="username" label="Username (usually the email)"><Input autoComplete="off" /></Form.Item></Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="password" label="Password / app password" extra={settings?.hasPassword ? 'Saved. Leave empty to keep it.' : undefined}>
                      <Input.Password autoComplete="new-password" placeholder={settings?.hasPassword ? '••••••••' : ''} />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}
            <Row gutter={12}>
              <Col xs={24} md={12}><Form.Item name="fromAddress" label="Send as (email)" rules={[{ type: 'email', message: 'Not a valid email' }]} extra="Best the same as the mailbox username."><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="fromName" label="Send as (name)" extra="Empty = your shop name."><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="replyTo" label="Replies go to" rules={[{ type: 'email', message: 'Not a valid email' }]}><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="adminRecipients" label="Shop alerts go to" extra="New orders and applications. Several: separate with commas."><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="dailyLimit" label="Most emails per day" extra={`Empty = ${mode === 'resend' ? '100 (Resend free)' : '300'}. Group emails above it wait for the next day.`}><InputNumber min={1} max={100000} style={{ width: '100%' }} /></Form.Item></Col>
              {settings && !settings.isProduction && (
                <Col xs={24}>
                  <Form.Item name="testRecipient" label="Test server: send every email to" rules={[{ type: 'email', message: 'Not a valid email' }]}
                    extra="This is a test copy with real customer data. Every email goes only to this address; empty = no email leaves the server.">
                    <Input placeholder="you@example.com" />
                  </Form.Item>
                </Col>
              )}
            </Row>
            <Button type="primary" htmlType="submit" loading={saving}>Save</Button>
          </Form>
        </Card>
      </Col>
      <Col xs={24} xl={10}>
        <Card size="small" title={<Space><MailOutlined /> Send a test email</Space>}>
          <Paragraph type="secondary">Save first, then send a test. If the mailbox refuses, you see why.</Paragraph>
          <Space.Compact style={{ width: '100%' }}>
            <Input value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="you@example.com" type="email" />
            <Button type="primary" loading={testing} disabled={!testTo} onClick={async () => {
              try {
                const result = await sendTest({ to: testTo }).unwrap();
                setTestResult({ ok: true, text: `${result.message ?? 'Sent'} — ${result.note}` });
              } catch (error: any) {
                setTestResult({ ok: false, text: error?.data?.message ?? 'Failed' });
              }
            }}>Send test</Button>
          </Space.Compact>
          {testResult && <Alert style={{ marginTop: 12 }} type={testResult.ok ? 'success' : 'error'} showIcon message={testResult.text} />}
        </Card>
        <DeliverabilityCard from={form.getFieldValue('fromAddress') || settings?.fromAddress} />
        <Card size="small" title="Which mailbox should I use?" style={{ marginTop: 16 }}>
          <Paragraph style={{ fontSize: 13 }}>
            <strong>Order emails:</strong> Resend’s free plan (100 a day) from your verified domain — reliable and free.
          </Paragraph>
          <Paragraph style={{ fontSize: 13 }}>
            <strong>Free and quick:</strong> your Hostinger mailbox, or a Gmail / Outlook address with an app password — fine for order emails and small groups (~300–500 a day).
          </Paragraph>
          <Paragraph style={{ fontSize: 13 }}>
            <strong>Best for your brand:</strong> a mailbox on your own domain (e.g. shop@yourshop.mk) from your hosting — customers trust it more and it lands in spam less.
          </Paragraph>
          <Paragraph style={{ fontSize: 13, marginBottom: 0 }}>
            <strong>Newsletters to hundreds:</strong> Brevo’s free plan (300 a day) with your domain verified.
          </Paragraph>
        </Card>
      </Col>
    </Row>
  );
}

function DeliverabilityCard({ from }: { from?: string }) {
  const [check, { data, isFetching, error }] = useLazyGetDeliverabilityQuery();
  const color = { ok: '#16794c', warn: '#a35c00', bad: '#b42318' } as const;
  return (
    <Card size="small" title="Will it land in the inbox?" style={{ marginTop: 16 }} extra={<Button size="small" loading={isFetching} onClick={() => check(from || undefined)}>Check</Button>}>
      {!data && !error && <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>Checks your sending domain’s SPF, DKIM and DMARC records — the things Gmail looks at before deciding “inbox” or “spam”.</Paragraph>}
      {error && <Alert type="warning" showIcon message={(error as any)?.data?.message ?? 'Could not check'} />}
      {data && (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>{data.domain}</Text>
          {data.checks.map((item) => (
            <div key={item.key} className="admin-feature-row" style={{ alignItems: 'flex-start' }}>
              <div>
                <Text strong>{item.label}</Text>
                {item.found && <div><Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-all' }}>{item.found}</Text></div>}
                {item.fix && <div style={{ fontSize: 12, color: color[item.status] }}>{item.fix}</div>}
              </div>
              <Tag color={item.status === 'ok' ? 'green' : item.status === 'warn' ? 'orange' : 'red'}>{item.status === 'ok' ? 'OK' : item.status === 'warn' ? 'Check' : 'Missing'}</Tag>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ================================================================= page */

export default function AdminEmailsPage() {
  const [params, setParams] = useSearchParams();
  const writingOn = useFeature('admin_emails');
  const { data: overview } = useGetEmailOverviewQuery(undefined, { skip: !writingOn });
  const tab = params.get('tab') ?? (writingOn ? 'outbox' : 'settings');

  const items = [
    ...(writingOn ? [
      { key: 'outbox', label: <Badge count={overview?.notSent ?? 0} size="small" offset={[10, 0]}>Outbox</Badge>, children: <Outbox /> },
      { key: 'compose', label: 'Write', children: <Compose /> },
      { key: 'campaigns', label: 'Sent by admins', children: <Campaigns /> },
    ] : []),
    { key: 'automatic', label: 'Automatic emails', children: <AutomaticEmails /> },
    { key: 'settings', label: 'Settings', children: <MailboxSettings /> },
  ];

  return (
    <div className="admin-emails">
      <Title level={2} style={{ marginBottom: 4 }}>Emails</Title>
      <Paragraph type="secondary">Everything your shop emails — what was sent, what was not, and writing to your customers.</Paragraph>
      <Tabs
        activeKey={items.some((item) => item.key === tab) ? tab : items[0].key}
        onChange={(key) => { params.set('tab', key); setParams(params, { replace: true }); }}
        items={items}
        destroyOnHidden
      />
    </div>
  );
}

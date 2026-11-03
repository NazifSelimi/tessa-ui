import { useEffect, useState } from 'react';
import {
  Typography, Table, Tag, Card, Button, Modal, Form, InputNumber, Input, Switch, Space, App, Alert,
} from 'antd';
import { EditOutlined, WalletOutlined } from '@ant-design/icons';
import {
  useGetAdminReferralsQuery,
  useUpdateReferralSettingsMutation,
  useUpdateReferralCodeMutation,
  useAdjustStoreCreditMutation,
  type AdminReferralCode,
  type ReferralSettings,
} from '@/features/referrals/api';
import { extractErrorMessage } from '@/shared/utils/error';
import { notifyError } from '@/shared/utils/notify';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Title, Text, Paragraph } = Typography;

/**
 * Stylist referral codes: clients get the code's discount, the stylist earns
 * store credit on confirmed orders. Codes are created when a stylist opens
 * their "Earn with TESSA" page.
 */
export default function AdminReferralsPage() {
  const { message, modal } = App.useApp();
  const { data, isLoading } = useGetAdminReferralsQuery();
  const [updateSettings, { isLoading: savingSettings }] = useUpdateReferralSettingsMutation();
  const [updateCode, { isLoading: savingCode }] = useUpdateReferralCodeMutation();
  const [adjustCredit, { isLoading: adjusting }] = useAdjustStoreCreditMutation();
  const [settingsForm] = Form.useForm<ReferralSettings & { applyToExisting?: boolean }>();
  const [codeForm] = Form.useForm();
  const [creditForm] = Form.useForm<{ amount: number; note: string }>();
  const [editing, setEditing] = useState<AdminReferralCode | null>(null);
  const [crediting, setCrediting] = useState<AdminReferralCode | null>(null);

  useEffect(() => {
    if (data?.settings) settingsForm.setFieldsValue(data.settings);
  }, [data?.settings, settingsForm]);

  const saveSettings = async ({ applyToExisting, ...values }: ReferralSettings & { applyToExisting?: boolean }) => {
    const save = async () => {
      try {
        await updateSettings({ ...values, applyToExisting: !!applyToExisting }).unwrap();
        message.success(applyToExisting ? 'Terms saved and applied to every code' : 'Defaults saved for new codes');
        settingsForm.setFieldValue('applyToExisting', false);
      } catch (error) {
        notifyError(extractErrorMessage(error));
      }
    };

    if (!applyToExisting) return save();
    modal.confirm({
      title: `Change the terms of all ${data?.codes.length ?? 0} codes?`,
      content: `Every stylist's code will become -${values.discountPercentage}% for clients and +${values.commissionPercentage}% credit${values.firstOrderOnly ? ', first order only' : ''}. Orders already placed keep the credit they earned.`,
      okText: 'Apply to all codes',
      onOk: save,
    });
  };

  const openEdit = (code: AdminReferralCode) => {
    setEditing(code);
    codeForm.setFieldsValue(code);
  };

  const saveCode = async () => {
    if (!editing) return;
    try {
      const values = await codeForm.validateFields();
      await updateCode({ id: editing.id, ...values }).unwrap();
      message.success('Code updated');
      setEditing(null);
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) return;
      notifyError(extractErrorMessage(error));
    }
  };

  const saveCredit = async () => {
    if (!crediting) return;
    try {
      const values = await creditForm.validateFields();
      const result = await adjustCredit({ userId: crediting.stylist.id, ...values }).unwrap();
      message.success(`New balance: ${formatPrice(result.balance)}`);
      setCrediting(null);
      creditForm.resetFields();
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) return;
      notifyError(extractErrorMessage(error));
    }
  };

  const codes = data?.codes ?? [];
  const totals = codes.reduce((sum, code) => ({
    orders: sum.orders + code.orders,
    sales: sum.sales + code.clientSales,
    balance: sum.balance + code.balance,
  }), { orders: 0, sales: 0, balance: 0 });

  return (
    <div>
      <Title level={2}>Stylist Referrals</Title>
      <Paragraph type="secondary">
        Each stylist shares their own code. A client using it gets the discount (still limited by the minimum profit),
        and the stylist earns store credit once the order is confirmed or shipped. Cancelling the order takes the credit back.
        Stylists spend the credit on their own orders at checkout.
      </Paragraph>

      <Space wrap size="middle" style={{ marginBottom: 16 }}>
        <Card size="small"><Text type="secondary">Client orders</Text><Title level={4} style={{ margin: 0 }}>{totals.orders}</Title></Card>
        <Card size="small"><Text type="secondary">Client sales (goods)</Text><Title level={4} style={{ margin: 0 }}>{formatPrice(totals.sales)}</Title></Card>
        <Card size="small"><Text type="secondary">Unspent stylist credit</Text><Title level={4} style={{ margin: 0 }}>{formatPrice(totals.balance)}</Title></Card>
      </Space>

      <Card title="Defaults for new codes" style={{ marginBottom: 16 }}>
        <Form form={settingsForm} layout="inline" onFinish={saveSettings}>
          <Form.Item name="discountPercentage" label="Client discount %" rules={[{ required: true }]}>
            <InputNumber min={0} max={50} />
          </Form.Item>
          <Form.Item name="commissionPercentage" label="Stylist credit %" rules={[{ required: true }]}>
            <InputNumber min={0} max={30} step={0.5} />
          </Form.Item>
          <Form.Item name="maxCommission" label="Max credit per order (MKD)" rules={[{ required: true }]} tooltip="The most a stylist earns from one client order. 0 means no limit.">
            <InputNumber min={0} max={100000} step={10} precision={0} />
          </Form.Item>
          <Form.Item name="firstOrderOnly" label="First order only" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="applyToExisting" label="Also change existing codes" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingSettings}>Save</Button>
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Without “Also change existing codes”, only new codes get these terms. You can still change one stylist's terms with Edit below.
          The max credit per order applies to every code straight away (0 = no limit); orders already placed keep their credit.
        </Text>
      </Card>

      {!isLoading && codes.length === 0 && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message="No codes yet. A stylist gets a code the first time they open “Earn with TESSA” in their salon menu." />
      )}

      <Table<AdminReferralCode>
        rowKey="id"
        loading={isLoading}
        dataSource={codes}
        pagination={{ pageSize: 25 }}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Code', dataIndex: 'code', render: (code: string, row) => <Space><Text strong copyable>{code}</Text>{!row.isActive && <Tag color="red">Off</Tag>}</Space> },
          { title: 'Stylist', key: 'stylist', render: (_, row) => <div><div>{row.stylist.name || '—'}</div><Text type="secondary">{row.stylist.email}</Text></div> },
          { title: 'Terms', key: 'terms', render: (_, row) => <span>-{row.discountPercentage}% / +{row.commissionPercentage}%{(row.maxCommission ?? 0) > 0 && <Text type="secondary"> (max {formatPrice(row.maxCommission ?? 0)})</Text>}{row.firstOrderOnly && <Tag style={{ marginLeft: 6 }}>1st order</Tag>}</span> },
          { title: 'Orders', dataIndex: 'orders', sorter: (a, b) => a.orders - b.orders },
          { title: 'Client sales', dataIndex: 'clientSales', render: formatPrice, sorter: (a, b) => a.clientSales - b.clientSales, defaultSortOrder: 'descend' },
          { title: 'Earned', dataIndex: 'earned', render: formatPrice },
          { title: 'Balance', dataIndex: 'balance', render: formatPrice },
          {
            title: '', key: 'actions', render: (_, row) => <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>Edit</Button>
              <Button size="small" icon={<WalletOutlined />} onClick={() => setCrediting(row)}>Credit</Button>
            </Space>,
          },
        ]}
      />

      <Modal title={`Edit ${editing?.code ?? ''}`} open={!!editing} onCancel={() => setEditing(null)} onOk={saveCode} confirmLoading={savingCode} okText="Save">
        <Form form={codeForm} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true, pattern: /^[A-Za-z0-9-]{4,20}$/, message: '4–20 letters, numbers or dashes' }]} normalize={(value: string) => value?.toUpperCase()}>
            <Input />
          </Form.Item>
          <Form.Item name="discountPercentage" label="Client discount %" rules={[{ required: true }]}>
            <InputNumber min={0} max={50} precision={0} />
          </Form.Item>
          <Form.Item name="commissionPercentage" label="Stylist credit %" rules={[{ required: true }]}>
            <InputNumber min={0} max={30} step={0.5} />
          </Form.Item>
          <Form.Item name="firstOrderOnly" label="First order only" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`Store credit · ${crediting?.stylist.name ?? ''}`} open={!!crediting} onCancel={() => setCrediting(null)} onOk={saveCredit} confirmLoading={adjusting} okText="Save">
        <Paragraph type="secondary">
          Current balance: {formatPrice(crediting?.balance ?? 0)}. Use a negative amount to take credit away (for example after paying it out).
        </Paragraph>
        <Form form={creditForm} layout="vertical">
          <Form.Item name="amount" label="Amount (MKD)" rules={[{ required: true }, { validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('Enter an amount other than 0')) }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Reason" rules={[{ required: true, max: 255 }]}>
            <Input placeholder="e.g. Welcome bonus, payout, correction" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import { fillUntouched } from '@/shared/utils/fillUntouched';
import { useEffect } from 'react';
import { Button, Card, Form, InputNumber, Space, Typography, message } from 'antd';
import { useGetPricingSettingsQuery, useUpdatePricingSettingsMutation, type PricingSettings } from '@/features/admin/api';
import { extractErrorMessage } from '@/shared/utils/error';

const { Text } = Typography;

/** Estimated cost and minimum profit that every offer and coupon is checked against. */
export default function PricingSettingsCard() {
  const { data } = useGetPricingSettingsQuery();
  const [save, { isLoading }] = useUpdatePricingSettingsMutation();
  const [form] = Form.useForm<PricingSettings>();

  useEffect(() => {
    if (data) fillUntouched(form, data);
  }, [data, form]);

  const submit = async (values: PricingSettings) => {
    try {
      await save(values).unwrap();
      message.success('Profit settings saved');
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  return (
    <Card size="small" title="Profit protection" style={{ marginBottom: 24 }}>
      <Form form={form} layout="inline" onFinish={submit}>
        <Form.Item name="costPercentage" label="Estimated cost" rules={[{ required: true }]}>
          <InputNumber min={1} max={100} addonAfter="% of retail" />
        </Form.Item>
        <Form.Item name="minMarginPercentage" label="Minimum profit" rules={[{ required: true }]}>
          <InputNumber min={0} max={90} addonAfter="%" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={isLoading}>Save</Button>
      </Form>
      <Space direction="vertical" size={0} style={{ marginTop: 8 }}>
        <Text type="secondary">Used for products without a real cost price. Offers and coupons together never take an order below cost + minimum profit; checkout trims the discount instead.</Text>
      </Space>
    </Card>
  );
}

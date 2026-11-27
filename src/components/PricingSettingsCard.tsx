import { fillUntouched } from '@/shared/utils/fillUntouched';
import { useEffect } from 'react';
import { Button, Card, Divider, Form, InputNumber, Radio, Space, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useGetPricingSettingsQuery, useUpdatePricingSettingsMutation, type PricingSettings } from '@/features/admin/api';
import { extractErrorMessage } from '@/shared/utils/error';
import { useFeature } from '@/shared/hooks/useFeature';
import { Link } from 'react-router-dom';
import { Alert, Tag } from 'antd';

const { Text } = Typography;

/** Estimated cost and minimum profit that every offer and coupon is checked against. */
export default function PricingSettingsCard() {
  const { data } = useGetPricingSettingsQuery();
  const [save, { isLoading }] = useUpdatePricingSettingsMutation();
  const [form] = Form.useForm<PricingSettings>();
  const protecting = useFeature('profit_protection');
  const { t } = useTranslation();

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
    <Card size="small" title={<Space>Profit protection {protecting ? <Tag color="success">On</Tag> : <Tag>Off</Tag>}</Space>} style={{ marginBottom: 24 }}>
      {!protecting && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={<>Off: offers and coupons give their full discount. Switch it on in <Link to="/admin/features">Features</Link> once products have real cost prices.</>}
        />
      )}
      <Form form={form} layout="inline" onFinish={submit}>
        <Form.Item name="costPercentage" label="Estimated cost" rules={[{ required: true }]}>
          <InputNumber min={1} max={100} addonAfter="% of retail" />
        </Form.Item>
        <Form.Item name="minMarginPercentage" label="Minimum profit" rules={[{ required: true }]}>
          <InputNumber min={0} max={90} addonAfter="%" />
        </Form.Item>
        {/* Owner rules Q1 and Q6: work even with profit protection off. */}
        <Divider style={{ margin: '12px 0' }} />
        <Form.Item name="maxDiscountPercentage" label={t('adminPricing.maxDiscount')} tooltip={t('adminPricing.maxDiscountHelp')} rules={[{ required: true }]}>
          <InputNumber min={0} max={100} addonAfter="%" />
        </Form.Item>
        <Form.Item name="freeShippingFrom" label={t('adminPricing.freeShippingFrom')} rules={[{ required: true }]}>
          <InputNumber min={0} max={1000000} step={100} addonAfter="MKD" />
        </Form.Item>
        <Form.Item name="freeShippingAfterDiscounts" label={t('adminPricing.freeShippingCount')}>
          <Radio.Group>
            <Radio value={false}>{t('adminPricing.beforeDiscounts')}</Radio>
            <Radio value={true}>{t('adminPricing.afterDiscounts')}</Radio>
          </Radio.Group>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={isLoading}>Save</Button>
      </Form>
      <Space direction="vertical" size={0} style={{ marginTop: 8 }}>
        <Text type="secondary">Used for products without a real cost price. Offers and coupons together never take an order below cost + minimum profit; checkout trims the discount instead.</Text>
      </Space>
    </Card>
  );
}

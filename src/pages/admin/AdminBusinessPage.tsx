/**
 * Business profile: the shop's name, logo, colour and contacts. Emails (and
 * later the storefront) read them from here, so the platform can run any
 * business without code changes.
 */
import { fillUntouched } from '@/shared/utils/fillUntouched';
import { useEffect } from 'react';
import { Alert, App, Button, Card, Col, ColorPicker, Form, Input, Row, Select, Space, Typography, Upload } from 'antd';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import {
  useGetBusinessQuery, useUpdateBusinessMutation, useUploadBusinessLogoMutation, type BusinessProfile,
} from '@/features/admin/platformApi';

const { Title, Paragraph, Text } = Typography;

export default function AdminBusinessPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<BusinessProfile>();
  const { data, isLoading } = useGetBusinessQuery();
  const [update, { isLoading: saving }] = useUpdateBusinessMutation();
  const [uploadLogo, { isLoading: uploading }] = useUploadBusinessLogoMutation();
  const values = Form.useWatch([], form);

  useEffect(() => {
    if (data) fillUntouched(form, data);
  }, [data, form]);

  const save = async (profile: BusinessProfile) => {
    try {
      await update(profile).unwrap();
      message.success('Business profile saved');
    } catch (error: any) {
      message.error(error?.data?.message ?? 'Could not save');
    }
  };

  const brand = values?.brand_color || data?.brand_color || '#9b5364';

  return (
    <div>
      <Title level={2} style={{ marginBottom: 4 }}>Business profile</Title>
      <Paragraph type="secondary">
        Your shop’s identity. Every email uses this name, logo, colour and contact details, so customers always see your brand.
      </Paragraph>
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={15}>
          <Card loading={isLoading}>
            <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="name" label="Shop name" rules={[{ required: true, message: 'Enter the shop name' }]}><Input maxLength={80} /></Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="legal_name" label="Company name (for the © line)"><Input maxLength={160} placeholder="e.g. Tessa DOOEL" /></Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="tagline" label="Short description"><Input maxLength={160} placeholder="e.g. Professional hair care" /></Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="email" label="Contact email" rules={[{ type: 'email', message: 'Not a valid email' }]}><Input /></Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="website" label="Website" rules={[{ type: 'url', message: 'Start with https://' }]}><Input placeholder="https://yourshop.mk" /></Form.Item>
                </Col>
                <Col xs={24} md={12}><Form.Item name="phone" label="Phone"><Input maxLength={40} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="phone_2" label="Second phone"><Input maxLength={40} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="address" label="Address"><Input maxLength={190} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="city" label="City"><Input maxLength={80} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="country" label="Country"><Input maxLength={80} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="instagram" label="Instagram"><Input placeholder="@yourshop or link" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="facebook" label="Facebook"><Input placeholder="page name or link" /></Form.Item></Col>
                <Col xs={24} md={12}>
                  <Form.Item name="default_locale" label="Language of customer emails when unknown">
                    <Select options={[{ value: 'mk', label: 'Македонски' }, { value: 'sq', label: 'Shqip' }, { value: 'en', label: 'English' }]} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="brand_color" label="Brand colour" getValueFromEvent={(color) => color?.toHexString?.() ?? color}>
                    <ColorPicker showText disabledAlpha format="hex" presets={[{ label: 'Suggested', colors: ['#9b5364', '#242124', '#1f6f5c', '#2b4c9b', '#b4235a', '#c65435'] }]} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="logo_url" label="Logo (PNG or JPG — Gmail does not show SVG)">
                    <Input placeholder="https://… or upload" addonAfter={(
                      <Upload
                        accept="image/png,image/jpeg,image/webp"
                        showUploadList={false}
                        beforeUpload={(file) => {
                          const body = new FormData();
                          body.append('logo', file);
                          uploadLogo(body).unwrap()
                            .then((profile) => { form.setFieldsValue({ logo_url: profile.logo_url }); message.success('Logo uploaded'); })
                            .catch((error) => message.error(error?.data?.message ?? 'Upload failed'));
                          return false;
                        }}
                      >
                        <Button type="text" size="small" icon={<UploadOutlined />} loading={uploading}>Upload</Button>
                      </Upload>
                    )} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>Save</Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card title="How emails will look" size="small">
            <div className="business-preview">
              <div className="business-preview__logo">
                {values?.logo_url ? <img src={values.logo_url} alt="" /> : <strong>{values?.name || 'Your shop'}</strong>}
              </div>
              <div className="business-preview__card" style={{ borderTopColor: brand }}>
                <Text strong style={{ fontSize: 18 }}>Thank you for your order!</Text>
                <p>We have received your order and will confirm it shortly.</p>
                <span className="business-preview__button" style={{ background: brand }}>View order</span>
              </div>
              <div className="business-preview__footer">
                <strong>{(values?.website || '').replace(/^https?:\/\/(www\.)?/, '') || values?.name}</strong><br />
                {values?.email}{values?.phone ? <><br />{values.phone}</> : null}
              </div>
            </div>
          </Card>
          <Alert style={{ marginTop: 16 }} type="info" showIcon message="Selling the platform to another business?" description="Change these fields, switch off the features they don't need on Admin → Features and connect their mailbox on Admin → Emails → Settings. No code changes." />
          <Space style={{ marginTop: 8 }} />
        </Col>
      </Row>
    </div>
  );
}

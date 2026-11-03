import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Input, Space, Form, InputNumber, Select, Upload, Row, Col, App, Modal, Switch, Checkbox } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useGetCategoriesQuery, useGetBrandsQuery, useGetHairProfileOptionsQuery } from '@/features/products/api';
import { useCreateProductMutation, useUpdateProductMutation, useGetProductFamiliesQuery } from '@/features/admin/api';
import type { Product } from '@/types';
import { convertToWebP } from '@/shared/utils/imageUtils';

const { Text } = Typography;

/** The fields the backend actually accepts (matching controller validation). */
interface ProductFormValues {
  name: string;
  price: number;
  stylist_price?: number;
  stylist_only?: boolean;
  normalize_catalog_background?: boolean;
  quantity: number;
  category_id: number;
  brand_id: number;
  description_en?: string;
  description_mk?: string;
  description_shq?: string;
  hair_type_ids?: number[];
  hair_concern_ids?: number[];
  product_family_id?: number | null;
  shade_code?: string;
  shade_name?: string;
  shade_sort_order?: number | null;
}

/**
 * Build snapshot of current form values from a Product so we can diff later.
 */
function snapshotFromProduct(product: Product): ProductFormValues {
  return {
    name: product.name,
    price: Number(product.price ?? 0),
    stylist_price: Number(product.stylistPrice ?? 0),
    stylist_only: Boolean(product.stylistOnly),
    quantity: product.quantity ?? 0,
    category_id: Number(product.categoryId || (product.category as any)?.id || 0),
    brand_id: Number(product.brandId || (product.brand as any)?.id || 0),
    description_en: product.translations?.en ?? '',
    description_mk: product.translations?.mk ?? '',
    description_shq: product.translations?.shq ?? '',
    hair_type_ids: product.hairTypeIds ?? [],
    hair_concern_ids: product.hairConcernIds ?? [],
    product_family_id: product.shadeFamilyId ? Number(product.shadeFamilyId) : null,
    shade_code: product.shadeCode ?? '',
    shade_name: product.shadeName ?? '',
    shade_sort_order: product.shadeSortOrder ?? null,
  };
}

interface ProductEditorModalProps {
  open: boolean;
  /** The product to edit, or null to create a new one. */
  product: Product | null;
  onClose: () => void;
  onSaved?: (product: Product | undefined) => void;
}

/** Add/edit product form, shared by the admin Products page and the storefront admin controls. */
export default function ProductEditorModal({ open, product: editingProduct, onClose, onSaved }: ProductEditorModalProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [swatchList, setSwatchList] = useState<UploadFile[]>([]);
  const [removeSwatch, setRemoveSwatch] = useState(false);
  const [form] = Form.useForm<ProductFormValues>();

  const { data: categories = [] } = useGetCategoriesQuery(undefined, { skip: !open });
  const { data: brands = [] } = useGetBrandsQuery(undefined, { skip: !open });
  const { data: hairProfileOptions } = useGetHairProfileOptionsQuery(undefined, { skip: !open });
  const { data: productFamilies = [] } = useGetProductFamiliesQuery(undefined, { skip: !open });

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  useEffect(() => {
    if (!open) return;

    setFileList([]);
    setSwatchList([]);
    setRemoveSwatch(false);

    if (editingProduct) {
      form.setFieldsValue({
        ...snapshotFromProduct(editingProduct),
        normalize_catalog_background: false,
      });
      return;
    }

    form.resetFields();
    form.setFieldsValue({
      stylist_only: false,
      normalize_catalog_background: false,
      description_en: '',
      description_mk: '',
      description_shq: '',
    });
  }, [open, editingProduct, form]);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();
      let saved: Product | undefined;

      if (editingProduct) {
        /* ---- UPDATE: only send fields that actually changed ---- */
        const original = snapshotFromProduct(editingProduct);
        const fieldKeys: (keyof ProductFormValues)[] = [
          'name', 'price', 'stylist_price', 'stylist_only', 'quantity', 'category_id', 'brand_id',
          'product_family_id', 'shade_code', 'shade_name', 'shade_sort_order',
        ];
        let hasChanges = false;

        for (const key of fieldKeys) {
          const newVal = values[key] ?? '';
          const oldVal = original[key] ?? '';

          if (String(newVal) !== String(oldVal)) {
            if (key === 'stylist_only') {
              formData.append(key, newVal ? '1' : '0');
            } else {
              formData.append(key, String(newVal));
            }
            hasChanges = true;
          }
        }

        const translationMap = {
          en: values.description_en ?? '',
          mk: values.description_mk ?? '',
          shq: values.description_shq ?? '',
        };
        const originalTranslationMap = {
          en: String(original.description_en ?? ''),
          mk: String(original.description_mk ?? ''),
          shq: String(original.description_shq ?? ''),
        };

        if (
          translationMap.en !== originalTranslationMap.en ||
          translationMap.mk !== originalTranslationMap.mk ||
          translationMap.shq !== originalTranslationMap.shq
        ) {
          formData.append('translations[en]', translationMap.en);
          formData.append('translations[mk]', translationMap.mk);
          formData.append('translations[shq]', translationMap.shq);
          hasChanges = true;
        }

        const appendProfileIds = (key: 'hair_type_ids' | 'hair_concern_ids') => {
          const next = [...(values[key] ?? [])].sort((a, b) => a - b);
          const previous = [...(original[key] ?? [])].sort((a, b) => a - b);
          if (next.join(',') === previous.join(',')) return;
          next.forEach((id) => formData.append(`${key}[]`, String(id)));
          hasChanges = true;
        };
        appendProfileIds('hair_type_ids');
        appendProfileIds('hair_concern_ids');

        // Handle image upload — always send if a new file was picked
        if (fileList.length > 0 && fileList[0].originFileObj) {
          const optimizedFile = await convertToWebP(fileList[0].originFileObj as File, 0.82);
          formData.append('image', optimizedFile, optimizedFile.name);
          formData.append('normalize_catalog_background', values.normalize_catalog_background ? '1' : '0');
          hasChanges = true;
        }

        if (swatchList.length > 0 && swatchList[0].originFileObj) {
          formData.append('swatch', swatchList[0].originFileObj as File);
          hasChanges = true;
        } else if (removeSwatch) {
          formData.append('remove_swatch', '1');
          hasChanges = true;
        }

        if (!hasChanges) {
          message.info('No changes detected');
          return;
        }

        saved = await updateProduct({ id: String(editingProduct.id), data: formData }).unwrap();
        message.success('Product updated successfully');
      } else {
        /* ---- CREATE: send all fields ---- */
        formData.append('name', values.name);
        formData.append('price', String(values.price));
        if (values.stylist_price !== undefined && values.stylist_price !== null) {
          formData.append('stylist_price', String(values.stylist_price));
        }
        formData.append('stylist_only', values.stylist_only ? '1' : '0');
        formData.append('quantity', String(values.quantity));
        formData.append('category_id', String(values.category_id));
        formData.append('brand_id', String(values.brand_id));
        formData.append('translations[en]', values.description_en ?? '');
        formData.append('translations[mk]', values.description_mk ?? '');
        formData.append('translations[shq]', values.description_shq ?? '');
        (values.hair_type_ids ?? []).forEach((id) => formData.append('hair_type_ids[]', String(id)));
        (values.hair_concern_ids ?? []).forEach((id) => formData.append('hair_concern_ids[]', String(id)));

        // Handle image upload
        if (fileList.length > 0 && fileList[0].originFileObj) {
          const optimizedFile = await convertToWebP(fileList[0].originFileObj as File, 0.82);
          formData.append('image', optimizedFile, optimizedFile.name);
          formData.append('normalize_catalog_background', values.normalize_catalog_background ? '1' : '0');
        }

        saved = await createProduct(formData).unwrap();
        message.success('Product created successfully');
      }

      close();
      onSaved?.(saved);
    } catch (error: any) {
      message.error(error?.data?.message || 'Failed to save product');
    }
  };

  /** Upload props — prevent automatic upload, keep single file in state. */
  const uploadProps: UploadProps = {
    beforeUpload: () => false,
    fileList,
    onChange: ({ fileList: newList }) => setFileList(newList.slice(-1)),
    accept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
    maxCount: 1,
    listType: 'picture-card',
  };

  const isEditing = !!editingProduct;

  return (
    <Modal
      title={isEditing ? 'Edit Product' : 'Add Product'}
      open={open}
      onOk={handleSave}
      confirmLoading={isCreating || isUpdating}
      onCancel={close}
      width={700}
      forceRender
      destroyOnClose
      footer={(_, { OkBtn, CancelBtn }) => (
        <Space>
          {isEditing && (
            <Button onClick={() => { close(); navigate(`/admin/catalog-images?product=${editingProduct.id}`); }}>All photos</Button>
          )}
          <CancelBtn />
          <OkBtn />
        </Space>
      )}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="name" label="Product Name" rules={[{ required: !isEditing, message: 'Please enter product name' }]}>
          <Input placeholder="Product name" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="brand_id" label="Brand" rules={[{ required: !isEditing, message: 'Please select a brand' }]}>
              <Select placeholder="Select brand" showSearch optionFilterProp="children">
                {brands.map((b) => (
                  <Select.Option key={b.id} value={Number(b.id)}>{b.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="category_id" label="Category" rules={[{ required: !isEditing, message: 'Please select a category' }]}>
              <Select placeholder="Select category" showSearch optionFilterProp="children">
                {categories.map((c) => (
                  <Select.Option key={c.id} value={Number(c.id)}>{c.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="hair_type_ids"
              label="Suitable hair types"
              extra="Used by the hair quiz. Choose every hair type this product genuinely supports."
            >
              <Select mode="multiple" allowClear placeholder="Choose hair types" options={hairProfileOptions?.hairTypes.map((item) => ({ value: item.id, label: item.name }))} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="hair_concern_ids"
              label="Helps with"
              extra="Used by the hair quiz. Choose the concerns this product addresses."
            >
              <Select mode="multiple" allowClear placeholder="Choose concerns" options={hairProfileOptions?.hairConcerns.map((item) => ({ value: item.id, label: item.name }))} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={12} sm={8}>
            <Form.Item name="price" label="Price (MKD)" rules={[{ required: !isEditing, message: 'Please enter price' }]}>
              <InputNumber min={0} prefix="MKD" placeholder="0.00" style={{ width: '100%' }} precision={2} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item
              name="stylist_price"
              label="Stylist Price (MKD)"
              extra={!isEditing ? 'Auto-calculated as 90% of price if empty' : undefined}
            >
              <InputNumber min={0} prefix="MKD" placeholder="0.00" style={{ width: '100%' }} precision={2} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="quantity" label="Stock Qty" rules={[{ required: !isEditing, message: 'Please enter quantity' }]}>
              <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="stylist_only" label="Stylist Only" valuePropName="checked" initialValue={false}>
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="description_en" label="Description (English)">
              <Input.TextArea rows={3} placeholder="English product description" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="description_mk" label="Description (Macedonian)">
              <Input.TextArea rows={3} placeholder="Македонски опис" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="description_shq" label="Description (Albanian)">
              <Input.TextArea rows={3} placeholder="Pershkrimi ne shqip" />
            </Form.Item>
          </Col>
        </Row>

        {isEditing && (
          <>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="product_family_id"
                  label="Colour line"
                  extra="Shades of one line share a shop card, the shade picker and the brand catalogue."
                >
                  <Select
                    allowClear
                    placeholder="Not a colour"
                    options={productFamilies.map((family) => ({ value: Number(family.id), label: `${family.name} (${family.shadeCount})` }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={8} sm={4}>
                <Form.Item name="shade_code" label="Shade code" extra="As in the catalogue, e.g. 7.43">
                  <Input placeholder="7.43" maxLength={20} />
                </Form.Item>
              </Col>
              <Col xs={16} sm={8}>
                <Form.Item name="shade_name" label="Shade name">
                  <Input placeholder="Copper Golden Blonde" maxLength={100} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item name="shade_sort_order" label="Shade order" extra="Lower numbers come first">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={16}>
                <Form.Item label="Shade swatch" extra="The small hair-colour picture in the shade picker. JPG, PNG or WebP, max 2MB.">
                  <Space align="start">
                    {editingProduct.swatch && !removeSwatch && swatchList.length === 0 && (
                      <img src={editingProduct.swatch} alt="Current swatch" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%' }} />
                    )}
                    <Upload
                      beforeUpload={() => false}
                      fileList={swatchList}
                      onChange={({ fileList: newList }) => { setSwatchList(newList.slice(-1)); setRemoveSwatch(false); }}
                      accept="image/jpeg,image/png,image/webp"
                      maxCount={1}
                      listType="picture-card"
                    >
                      {swatchList.length === 0 && (
                        <div>
                          <PlusOutlined />
                          <div style={{ marginTop: 8 }}>{editingProduct.swatch ? 'Replace' : 'Upload'}</div>
                        </div>
                      )}
                    </Upload>
                    {editingProduct.swatch && swatchList.length === 0 && (
                      <Checkbox checked={removeSwatch} onChange={(event) => setRemoveSwatch(event.target.checked)}>
                        Remove swatch
                      </Checkbox>
                    )}
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Form.Item
          label="Product Image"
          extra="Images are automatically converted to WebP. Use the warm catalog background only for isolated product packshots; keep extensions and shade-sensitive hair imagery on a neutral background. Max 10MB."
        >
          <Upload {...uploadProps}>
            {fileList.length === 0 && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            )}
          </Upload>
          {isEditing && editingProduct.image && fileList.length === 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Current image:</Text>
              <br />
              <img
                src={editingProduct.image}
                alt="Current"
                style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 4, marginTop: 4 }}
              />
            </div>
          )}
          <Form.Item
            name="normalize_catalog_background"
            valuePropName="checked"
            noStyle
          >
            <Checkbox style={{ marginTop: 12 }}>
              Use warm catalog background for this packshot
            </Checkbox>
          </Form.Item>
        </Form.Item>
      </Form>
    </Modal>
  );
}

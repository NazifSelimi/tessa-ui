import { useState } from 'react';
import { App, Button, Select, Space } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/app/hooks';
import { selectToken } from '@/features/auth/slice';
import { DOCUMENT_LANGUAGES, downloadPdf, type DocumentLocale } from './documents';

/** "Order summary" and "Delivery note" PDF buttons for one order. */
export default function OrderDocumentButtons({ orderId }: { orderId: string | number }) {
  const { message } = App.useApp();
  const token = useAppSelector(selectToken);
  const [locale, setLocale] = useState<DocumentLocale | 'auto'>('auto');
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (type: 'invoice' | 'delivery-note') => {
    setBusy(type);
    try {
      await downloadPdf(token, `/v1/admin/orders/${orderId}/documents/${type}${locale === 'auto' ? '' : `?locale=${locale}`}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'The PDF could not be made.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Space.Compact>
      <Button icon={<FilePdfOutlined />} loading={busy === 'invoice'} onClick={() => download('invoice')}>Order summary</Button>
      <Button icon={<FilePdfOutlined />} loading={busy === 'delivery-note'} onClick={() => download('delivery-note')}>Delivery note</Button>
      <Select
        aria-label="PDF language"
        value={locale}
        onChange={setLocale}
        style={{ width: 150 }}
        options={[{ value: 'auto', label: "Customer's language" }, ...DOCUMENT_LANGUAGES]}
      />
    </Space.Compact>
  );
}

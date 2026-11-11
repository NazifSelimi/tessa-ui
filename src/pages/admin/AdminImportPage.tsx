/**
 * Excel import (/admin/import): update prices and stock, or add products,
 * from an Excel / CSV file. The admin always sees what will change first.
 */

import { useState } from 'react';
import { Alert, App, Button, Card, Checkbox, Col, Result, Row, Select, Space, Statistic, Steps, Table, Tag, Typography, Upload } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, InboxOutlined, UndoOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectToken } from '@/features/auth/slice';
import { baseApi, API_TAGS } from '@/api/baseApi';
import {
  applyImport, downloadCatalogue, FIELD_LABELS, previewImport, showValue, undoImport, uploadImport,
  type ImportAction, type ImportLine, type ImportPreview, type ImportResult,
} from '@/features/admin/productImport';

const { Paragraph, Text } = Typography;

const ACTION: Record<ImportAction, { label: string; color: string }> = {
  update: { label: 'will change', color: 'blue' },
  create: { label: 'will be added', color: 'green' },
  new: { label: 'not in catalogue', color: 'gold' },
  same: { label: 'no change', color: 'default' },
  skip: { label: 'skipped', color: 'red' },
};

const columns: TableProps<ImportLine>['columns'] = [
  { title: 'Row', dataIndex: 'line', width: 64 },
  { title: 'What happens', dataIndex: 'action', width: 140, render: (action: ImportAction) => <Tag color={ACTION[action].color}>{ACTION[action].label}</Tag> },
  {
    title: 'Product', key: 'product',
    render: (_, line) => (
      <div>
        {line.productId ? <Link to={`/product/${line.productId}`} target="_blank">{line.name}</Link> : (line.name ?? '—')}
        <div><Text type="secondary" style={{ fontSize: 12 }}>{[line.code && `code ${line.code}`, line.matchedBy && `found by ${line.matchedBy === 'code' ? 'article code' : line.matchedBy === 'id' ? 'product ID' : 'name'}`].filter(Boolean).join(' · ')}</Text></div>
      </div>
    ),
  },
  {
    title: 'Changes', key: 'changes',
    render: (_, line) => (
      <div>
        {Object.entries(line.changes).map(([field, change]) => (
          <div key={field}>
            <Text type="secondary">{FIELD_LABELS[field] ?? field}:</Text>{' '}
            {line.action === 'create' ? <Text strong>{showValue(change.to)}</Text> : <span><Text delete type="secondary">{showValue(change.from)}</Text> → <Text strong>{showValue(change.to)}</Text></span>}
          </div>
        ))}
        {line.problems.map((problem) => <div key={problem}><Text type="danger">{problem}</Text></div>)}
        {line.action === 'new' && <Text type="secondary">Tick “Add products that are not in the catalogue” to add it.</Text>}
      </div>
    ),
  },
];

export default function AdminImportPage() {
  const { message, modal } = App.useApp();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectToken);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [createNew, setCreateNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [undone, setUndone] = useState(false);

  const fail = (error: unknown) => message.error(error instanceof Error ? error.message : 'Something went wrong.');
  const refreshProducts = () => dispatch(baseApi.util.invalidateTags([API_TAGS.Products]));

  const start = async (file: File) => {
    setBusy(true);
    try {
      const data = await uploadImport(token, file);
      setPreview(data); setMapping(data.mapping); setCreateNew(false); setResult(null); setUndone(false);
    } catch (error) { fail(error); } finally { setBusy(false); }
  };

  const refresh = async (nextMapping: Record<string, number | null>, nextCreateNew: boolean) => {
    if (!preview) return;
    setMapping(nextMapping); setCreateNew(nextCreateNew); setBusy(true);
    try {
      setPreview({ ...(await previewImport(token, preview.token, { mapping: nextMapping, create_new: nextCreateNew })), filename: preview.filename });
    } catch (error) { fail(error); } finally { setBusy(false); }
  };

  const apply = () => {
    if (!preview) return;
    const { update, create } = preview.summary;
    modal.confirm({
      title: 'Save these changes?',
      content: `${update} product${update === 1 ? '' : 's'} will change${create ? ` and ${create} will be added` : ''}. You can undo it right after.`,
      okText: 'Save changes',
      onOk: async () => {
        try {
          setResult(await applyImport(token, preview.token, { mapping, create_new: createNew }));
          refreshProducts();
        } catch (error) { fail(error); }
      },
    });
  };

  const undo = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const data = await undoImport(token, preview.token);
      setUndone(true); refreshProducts();
      message.success(`Undone: ${data.restored} products put back${data.removed ? `, ${data.removed} added products removed` : ''}${data.kept ? `, ${data.kept} kept because they were already ordered` : ''}.`);
    } catch (error) { fail(error); } finally { setBusy(false); }
  };

  const reset = () => { setPreview(null); setResult(null); setUndone(false); };
  const step = result ? 2 : preview ? 1 : 0;
  const usedColumns = new Set(Object.values(mapping).filter((column) => column !== null && column !== undefined));

  return (
    <div>
      <Steps current={step} size="small" style={{ marginBottom: 20, maxWidth: 640 }} items={[{ title: 'Choose a file' }, { title: 'Check the changes' }, { title: 'Done' }]} />

      {step === 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="Import from Excel">
              <Upload.Dragger accept=".xlsx,.xls,.ods,.csv,.txt" multiple={false} showUploadList={false} disabled={busy} beforeUpload={(file) => { void start(file); return false; }}>
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">{busy ? 'Reading the file…' : 'Click or drop an Excel or CSV file here'}</p>
                <p className="ant-upload-hint">.xlsx, .xls or .csv, up to 10 MB. Nothing is saved until you check the changes.</p>
              </Upload.Dragger>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="How it works">
              <Paragraph>Use any list with headings: a supplier stock list, or your own file. Products are found by <b>Product ID</b>, then <b>article code</b>, then exact <b>name</b>.</Paragraph>
              <Paragraph>Empty cells change nothing. Headings in Macedonian, Albanian or English are recognised (Шифра, Назив, Цена, Залиха / Kodi, Emri, Çmimi, Sasia).</Paragraph>
              <Paragraph>The easiest start: download the catalogue, edit it in Excel, and import it back.</Paragraph>
              <Button icon={<DownloadOutlined />} onClick={() => downloadCatalogue(token).catch(fail)}>Download catalogue (Excel)</Button>
            </Card>
          </Col>
        </Row>
      )}

      {step === 1 && preview && (
        <div style={{ opacity: busy ? 0.6 : 1 }}>
          <Card size="small" title={`Columns in “${preview.filename ?? 'your file'}” (headings on row ${preview.headerRow})`} style={{ marginBottom: 16 }}>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>These were guessed from the headings. Change one if it is wrong; choose “not used” to leave a field alone.</Paragraph>
            <Row gutter={[12, 12]}>
              {Object.entries(preview.fields).filter(([field]) => !field.startsWith('shade_')).map(([field, label]) => (
                <Col xs={12} md={8} xl={6} key={field}>
                  <Text style={{ fontSize: 12 }}>{label}</Text>
                  <Select
                    style={{ width: '100%' }} allowClear placeholder="not used" value={mapping[field] ?? undefined}
                    onChange={(value) => refresh({ ...mapping, [field]: value ?? null }, createNew)}
                    options={preview.headings.map((heading, index) => ({ value: index, label: heading || `Column ${index + 1}`, disabled: usedColumns.has(index) && mapping[field] !== index }))}
                  />
                </Col>
              ))}
            </Row>
            <Checkbox style={{ marginTop: 14 }} checked={createNew} onChange={(event) => refresh(mapping, event.target.checked)}>
              Add products that are not in the catalogue ({preview.summary.new + preview.summary.create}). They stay hidden from customers until they have a photo.
            </Checkbox>
          </Card>

          {preview.errors.map((error) => <Alert key={error} type="error" showIcon message={error} style={{ marginBottom: 16 }} />)}

          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={4}><Card size="small"><Statistic title="Rows read" value={preview.summary.rows} /></Card></Col>
            <Col xs={12} md={5}><Card size="small"><Statistic title="Will change" value={preview.summary.update} valueStyle={{ color: '#1677ff' }} /></Card></Col>
            <Col xs={12} md={5}><Card size="small"><Statistic title={createNew ? 'Will be added' : 'Not in catalogue'} value={createNew ? preview.summary.create : preview.summary.new} /></Card></Col>
            <Col xs={12} md={5}><Card size="small"><Statistic title="No change" value={preview.summary.same} /></Card></Col>
            <Col xs={12} md={5}><Card size="small"><Statistic title="Skipped (problems)" value={preview.summary.problems} valueStyle={preview.summary.problems ? { color: '#cf1322' } : undefined} /></Card></Col>
          </Row>

          <Space wrap style={{ marginBottom: 12 }}>
            <Button type="primary" disabled={busy || preview.summary.update + preview.summary.create === 0} onClick={apply}>
              Save {preview.summary.update + preview.summary.create} change{preview.summary.update + preview.summary.create === 1 ? '' : 's'}
            </Button>
            <Button onClick={reset}>Choose another file</Button>
          </Space>

          <Table
            rowKey="line" size="small" dataSource={preview.lines} columns={columns} scroll={{ x: 720 }}
            pagination={{ pageSize: 50, showSizeChanger: false }}
            footer={preview.linesHidden ? () => `${preview.linesHidden} more rows are not listed here but are included.` : undefined}
            locale={{ emptyText: 'Nothing would change: the file matches the catalogue.' }}
          />
        </div>
      )}

      {step === 2 && result && (
        <Result
          status={undone ? 'info' : 'success'}
          title={undone ? 'The import was undone' : 'Import saved'}
          subTitle={undone ? 'Everything is as it was before.' : `${result.updated} products changed, ${result.created} added, ${result.skipped} rows skipped because of problems${result.notCreated ? `, ${result.notCreated} rows not in the catalogue left out` : ''}.`}
          extra={[
            !undone && <Button key="undo" icon={<UndoOutlined />} loading={busy} onClick={undo}>Undo this import</Button>,
            <Button key="again" type="primary" onClick={reset}>Import another file</Button>,
            <Link key="products" to="/admin/products"><Button>Go to products</Button></Link>,
          ]}
        />
      )}
    </div>
  );
}

/** Edit the Viber / WhatsApp message texts in Macedonian, Albanian and English. */

import { useEffect, useState } from 'react';
import { Alert, App, Button, Collapse, Flex, Input, Popconfirm, Space, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DEFAULT_TEMPLATES, fillTemplate, LANGS, PLACEHOLDERS, type MessageTemplateDef } from './templates';
import { useMessageTemplates } from './useMessageTemplates';

const { Text } = Typography;
const LANG_LABEL = { mk: 'Macedonian', sq: 'Albanian', en: 'English' } as const;
const SAMPLE = { name: 'Ana', order: 1234, total: '2.450 ден', code: 'ANA10' };

export default function TemplatesPanel() {
  const { message } = App.useApp();
  const { templates, shop, link, save, isSaving, savedOnServer, isLoading } = useMessageTemplates();
  const [draft, setDraft] = useState<MessageTemplateDef[]>(templates);
  const [shopName, setShopName] = useState(shop);
  const [website, setWebsite] = useState(link);

  useEffect(() => { setDraft(templates); }, [templates]);
  useEffect(() => { setShopName(shop); setWebsite(link); }, [shop, link]);

  const update = (key: string, patch: Partial<MessageTemplateDef>) =>
    setDraft((all) => all.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const addCustom = () => {
    const key = `custom_${Date.now().toString(36)}`;
    setDraft((all) => [...all, { key, label: 'My message', mk: 'Здраво {name}! ', sq: 'Përshëndetje {name}! ', en: 'Hi {name}! ', custom: true }]);
  };

  const onSave = async () => {
    const where = await save(draft, { shop: shopName, link: website });
    if (where === 'server') message.success('Templates saved');
    else message.warning('The server could not be reached; saved on this device only.');
  };

  return (
    <Flex vertical gap={12} style={{ maxWidth: 760 }}>
      {!savedOnServer && !isLoading && <Alert type="warning" showIcon message="Templates could not be loaded from the server; changes are kept on this device." />}
      <Text type="secondary">
        Placeholders are filled in for each person: {PLACEHOLDERS.map((p) => <Tag key={p}>{`{${p}}`}</Tag>)}
      </Text>
      <Space wrap>
        <Input addonBefore="{shop}" value={shopName} onChange={(e) => setShopName(e.target.value)} style={{ width: 260 }} />
        <Input addonBefore="{link}" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ width: 320 }} />
      </Space>

      <Collapse
        items={draft.map((t) => {
          const builtIn = DEFAULT_TEMPLATES.find((d) => d.key === t.key);
          return {
            key: t.key,
            label: <Space>{t.label}{t.custom && <Tag>own</Tag>}</Space>,
            children: (
              <Flex vertical gap={10}>
                <Input value={t.label} onChange={(e) => update(t.key, { label: e.target.value })} addonBefore="Name" maxLength={80} />
                {LANGS.map((lang) => (
                  <div key={lang}>
                    <Text strong>{LANG_LABEL[lang]}</Text>
                    <Input.TextArea autoSize={{ minRows: 2 }} maxLength={1500} value={t[lang]} onChange={(e) => update(t.key, { [lang]: e.target.value })} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{fillTemplate(t[lang], { ...SAMPLE, shop: shopName, link: website })}</Text>
                  </div>
                ))}
                {builtIn ? (
                  <Button size="small" onClick={() => update(t.key, builtIn)} style={{ alignSelf: 'flex-start' }}>Back to the original text</Button>
                ) : (
                  <Popconfirm title="Delete this message?" onConfirm={() => setDraft((all) => all.filter((x) => x.key !== t.key))}>
                    <Button size="small" danger style={{ alignSelf: 'flex-start' }}>Delete</Button>
                  </Popconfirm>
                )}
              </Flex>
            ),
          };
        })}
      />
      <Flex gap={8} wrap>
        <Button icon={<PlusOutlined />} onClick={addCustom}>Add my own message</Button>
        <Button type="primary" loading={isSaving} onClick={() => void onSave()}>Save templates</Button>
      </Flex>
    </Flex>
  );
}

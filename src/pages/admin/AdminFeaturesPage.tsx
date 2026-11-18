/**
 * Features: switch every optional tool of the shop on or off. Off means
 * hidden in the admin and the shop, and blocked on the server. Also where an
 * admin connects an AI assistant (MCP) to the shop.
 */
import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, Empty, Input, Row, Space, Switch, Tag, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, KeyOutlined, RobotOutlined } from '@ant-design/icons';
import {
  useCreateAiTokenMutation, useGetAdminFeaturesQuery, useGetAiTokensQuery, useRevokeAiTokenMutation, useUpdateFeaturesMutation,
  type AdminFeature, type FeatureKey,
} from '@/features/admin/platformApi';
import { formatDateTime } from '@/shared/utils/formatDate';

const { Title, Text, Paragraph } = Typography;

const AREAS: { area: AdminFeature['area']; title: string; hint: string }[] = [
  { area: 'shop', title: 'In the shop', hint: 'Customers and business accounts notice these.' },
  { area: 'admin', title: 'In the admin', hint: 'Only admins see these.' },
];

function FeatureRow({ feature, saving, onToggle }: { feature: AdminFeature; saving: boolean; onToggle: (on: boolean) => void }) {
  return (
    <div className="admin-feature-row">
      <div>
        <Space size={8} wrap>
          <Text strong>{feature.label}</Text>
          {!feature.enabled && <Tag>Off</Tag>}
        </Space>
        <Paragraph type="secondary" style={{ margin: '2px 0 0', fontSize: 13 }}>{feature.description}</Paragraph>
      </div>
      <Switch checked={feature.enabled} loading={saving} onChange={onToggle} aria-label={`${feature.label}: ${feature.enabled ? 'on' : 'off'}`} />
    </div>
  );
}

function copy(text: string, message: { success: (m: string) => void; error: (m: string) => void }) {
  navigator.clipboard.writeText(text).then(() => message.success('Copied'), () => message.error('Copy failed — select and copy it by hand.'));
}

function AiAssistantCard({ enabled }: { enabled: boolean }) {
  const { message, modal } = App.useApp();
  const { data } = useGetAiTokensQuery();
  const [createToken, { isLoading: creating }] = useCreateAiTokenMutation();
  const [revokeToken] = useRevokeAiTokenMutation();
  const [name, setName] = useState('Claude');
  const [fresh, setFresh] = useState<{ token: string; endpoint: string } | null>(null);
  const endpoint = fresh?.endpoint ?? data?.endpoint ?? '';
  const token = fresh?.token ?? '<your token>';
  const claudeCode = `claude mcp add --transport http shop ${endpoint} --header "Authorization: Bearer ${token}"`;
  const desktopJson = JSON.stringify({
    mcpServers: { shop: { command: 'npx', args: ['-y', 'mcp-remote', endpoint, '--header', `Authorization: Bearer ${token}`] } },
  }, null, 2);

  return (
    <Card title={<Space><RobotOutlined /> Connect an AI assistant (MCP)</Space>}>
      {!enabled ? (
        <Alert type="info" showIcon message="The AI assistant connection is switched off." />
      ) : (
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Paragraph style={{ margin: 0 }}>
            Ask an AI assistant things like <em>“what needs doing today?”</em>, <em>“which products are almost sold out?”</em>,
            {' '}<em>“set Botugen 300ml stock to 24”</em> or <em>“draft an email to business accounts about the new Fanola masks”</em>.
            It works with Claude (Code and Desktop), Cursor and other MCP apps. Drafted emails are never sent by the assistant: you open the draft and press Send.
          </Paragraph>
          <Space.Compact style={{ width: '100%', maxWidth: 460 }}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, e.g. Claude on my laptop" maxLength={60} />
            <Button
              type="primary"
              icon={<KeyOutlined />}
              loading={creating}
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  const created = await createToken({ name: name.trim() }).unwrap();
                  setFresh({ token: created.token, endpoint: created.endpoint });
                } catch {
                  message.error('Could not create a token');
                }
              }}
            >
              Create token
            </Button>
          </Space.Compact>
          {fresh && (
            <Alert
              type="warning"
              showIcon
              message="Copy this token now — it is shown only once"
              description={(
                <Space.Compact style={{ width: '100%' }}>
                  <Input readOnly value={fresh.token} style={{ fontFamily: 'monospace' }} />
                  <Button icon={<CopyOutlined />} onClick={() => copy(fresh.token, message)}>Copy</Button>
                </Space.Compact>
              )}
            />
          )}
          <div>
            <Text strong>Claude Code</Text>
            <pre className="admin-code">{claudeCode}</pre>
            <Button size="small" icon={<CopyOutlined />} onClick={() => copy(claudeCode, message)}>Copy command</Button>
          </div>
          <div>
            <Text strong>Claude Desktop / Cursor</Text> <Text type="secondary">(Settings → Developer → Edit config; needs Node.js)</Text>
            <pre className="admin-code">{desktopJson}</pre>
            <Button size="small" icon={<CopyOutlined />} onClick={() => copy(desktopJson, message)}>Copy config</Button>
          </div>
          <div>
            <Text strong>Tokens</Text>
            {(data?.tokens ?? []).length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tokens yet" />
            ) : (
              <div className="admin-feature-tokens">
                {data?.tokens.map((item) => (
                  <div key={item.id} className="admin-feature-row">
                    <div>
                      <Text>{item.name}</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>
                        {item.lastUsedAt ? `Last used ${formatDateTime(item.lastUsedAt)}` : 'Never used'}
                      </Text></div>
                    </div>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => modal.confirm({
                        title: `Revoke “${item.name}”?`,
                        content: 'The assistant using it loses access straight away.',
                        okText: 'Revoke',
                        okButtonProps: { danger: true },
                        onOk: () => revokeToken(item.id).unwrap(),
                      })}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Space>
      )}
    </Card>
  );
}

export default function AdminFeaturesPage() {
  const { message } = App.useApp();
  const { data, isLoading } = useGetAdminFeaturesQuery();
  const [updateFeatures] = useUpdateFeaturesMutation();
  const [saving, setSaving] = useState<FeatureKey | null>(null);
  const features = useMemo(() => data?.features ?? [], [data]);

  const toggle = async (feature: AdminFeature, on: boolean) => {
    setSaving(feature.key);
    try {
      await updateFeatures({ features: { [feature.key]: on } }).unwrap();
      message.success(`${feature.label} ${on ? 'switched on' : 'switched off'}`);
    } catch {
      message.error('Could not save');
    } finally {
      setSaving(null);
    }
  };

  const aiOn = features.some((feature) => feature.key === 'mcp' && feature.enabled);

  return (
    <div className="admin-features">
      <Title level={2} style={{ marginBottom: 4 }}>Features</Title>
      <Paragraph type="secondary">
        Keep only what the shop uses. A switched-off feature disappears from the admin and the shop and its server routes stop;
        switch it on again any time — nothing is deleted. Orders, products, customers, coupons and settings are always on.
      </Paragraph>
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={13}>
          {AREAS.map(({ area, title, hint }) => {
            const items = features.filter((feature) => feature.area === area);
            return items.length > 0 && (
              <Card
                key={area}
                loading={isLoading}
                style={{ marginBottom: 24 }}
                title={<Space>{title}<Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>{hint}</Text></Space>}
              >
                {items.map((feature) => (
                  <FeatureRow key={feature.key} feature={feature} saving={saving === feature.key} onToggle={(on) => toggle(feature, on)} />
                ))}
              </Card>
            );
          })}
        </Col>
        <Col xs={24} xl={11}>
          <AiAssistantCard enabled={aiOn} />
        </Col>
      </Row>
    </div>
  );
}

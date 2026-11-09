/**
 * Features: switch every optional tool of the platform on or off. Off means
 * hidden in the admin and the shop, and blocked on the server. Also where an
 * admin connects an AI assistant (MCP) to the shop.
 */
import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, Empty, Input, Row, Segmented, Select, Space, Switch, Tag, Tooltip, Typography } from 'antd';
import { CopyOutlined, CrownOutlined, DeleteOutlined, KeyOutlined, LockOutlined, RobotOutlined } from '@ant-design/icons';
import {
  useCreateAiTokenMutation, useGetAdminFeaturesQuery, useGetAiTokensQuery, useRevokeAiTokenMutation, useUpdateFeaturesMutation,
  type AdminFeature, type FeatureKey, type PlanKey,
} from '@/features/admin/platformApi';

const { Title, Text, Paragraph } = Typography;

const PLAN_META: Record<PlanKey, { label: string; color: string; blurb: string }> = {
  basic: { label: 'Basic', color: 'default', blurb: 'The online shop: orders, products, customers, coupons, plus these extras.' },
  pro: { label: 'Pro', color: 'blue', blurb: 'Marketing and admin tools for a growing business.' },
  premium: { label: 'Premium', color: 'gold', blurb: 'Automation: AI assistant and automatic messages.' },
};

function FeatureRow({ feature, saving, editPlans, onToggle, onPlan }: {
  feature: AdminFeature; saving: boolean; editPlans: boolean; onToggle: (on: boolean) => void; onPlan: (plan: PlanKey) => void;
}) {
  const locked = !feature.included;
  return (
    <div className={`admin-feature-row${locked ? ' is-locked' : ''}`}>
      <div>
        <Space size={8} wrap>
          <Text strong>{feature.label}</Text>
          <Tag>{feature.area === 'shop' ? 'Shop' : 'Admin'}</Tag>
          {!locked && !feature.enabled && <Tag>Off</Tag>}
          {locked && <Tag color={PLAN_META[feature.plan].color} icon={<LockOutlined />}>Upgrade to {PLAN_META[feature.plan].label}</Tag>}
        </Space>
        <Paragraph type="secondary" style={{ margin: '2px 0 0', fontSize: 13 }}>{feature.description}</Paragraph>
      </div>
      <Space>
        {editPlans && (
          <Select<PlanKey>
            size="small"
            value={feature.plan}
            style={{ width: 110 }}
            onChange={onPlan}
            options={(Object.keys(PLAN_META) as PlanKey[]).map((plan) => ({ value: plan, label: PLAN_META[plan].label }))}
            aria-label={`Plan for ${feature.label}`}
          />
        )}
        <Tooltip title={locked ? `Not in the current plan. Upgrade to ${PLAN_META[feature.plan].label} to use it.` : undefined}>
          <Switch checked={feature.enabled && !locked} disabled={locked} loading={saving} onChange={onToggle} aria-label={`${feature.label}: ${feature.enabled ? 'on' : 'off'}`} />
        </Tooltip>
      </Space>
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
        <Alert type="info" showIcon message="The AI assistant connection is off or not in this plan (Premium)." />
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
                        {item.lastUsedAt ? `Last used ${new Date(item.lastUsedAt).toLocaleString()}` : 'Never used'}
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
  const { message, modal } = App.useApp();
  const { data, isLoading } = useGetAdminFeaturesQuery();
  const [updateFeatures] = useUpdateFeaturesMutation();
  const [saving, setSaving] = useState<FeatureKey | null>(null);
  const [editPlans, setEditPlans] = useState(false);
  const features = useMemo(() => data?.features ?? [], [data]);
  const shopPlan = data?.plan ?? 'premium';

  const byPlan = useMemo(() => (['basic', 'pro', 'premium'] as PlanKey[]).map((plan) => ({
    plan,
    items: features.filter((feature) => feature.plan === plan),
  })), [features]);

  const save = async (key: FeatureKey | null, body: Parameters<typeof updateFeatures>[0], done: string) => {
    setSaving(key);
    try {
      await updateFeatures(body).unwrap();
      message.success(done);
    } catch {
      message.error('Could not save');
    } finally {
      setSaving(null);
    }
  };

  const changePlan = (plan: PlanKey) => modal.confirm({
    title: `Put this shop on the ${PLAN_META[plan].label} plan?`,
    content: plan === 'premium'
      ? 'Every feature becomes available.'
      : 'Features above this plan stop working straight away (nothing is deleted; they come back when you upgrade).',
    okText: `Switch to ${PLAN_META[plan].label}`,
    onOk: () => save(null, { shop_plan: plan }, `Shop is now on ${PLAN_META[plan].label}`),
  });

  const aiOn = features.some((feature) => feature.key === 'mcp' && feature.enabled && feature.included);

  return (
    <div className="admin-features">
      <Title level={2} style={{ marginBottom: 4 }}>Features & plan</Title>
      <Paragraph type="secondary">
        Keep only what the business uses. A switched-off feature disappears from the admin and the shop and its server routes stop;
        switch it on again any time — nothing is deleted. Orders, products, customers, coupons and settings are always on.
      </Paragraph>
      <Card size="small" style={{ marginBottom: 24 }} loading={isLoading}>
        <Space wrap size={16} style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <CrownOutlined style={{ fontSize: 20, color: '#c49a2c' }} />
            <Text strong>Plan of this shop</Text>
            <Segmented<PlanKey>
              value={shopPlan}
              onChange={(plan) => plan !== shopPlan && changePlan(plan)}
              options={(Object.keys(PLAN_META) as PlanKey[]).map((plan) => ({ value: plan, label: PLAN_META[plan].label }))}
            />
          </Space>
          <Space>
            <Text type="secondary">Edit which plan each feature belongs to</Text>
            <Switch size="small" checked={editPlans} onChange={setEditPlans} />
          </Space>
        </Space>
        <Paragraph type="secondary" style={{ margin: '8px 0 0', fontSize: 12 }}>
          For selling the platform: each business gets a plan. Set by hand for now (no online payment). {PLAN_META[shopPlan].blurb}
        </Paragraph>
      </Card>
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={13}>
          {byPlan.map(({ plan, items }) => items.length > 0 && (
            <Card
              key={plan}
              loading={isLoading}
              style={{ marginBottom: 24 }}
              title={<Space><Tag color={PLAN_META[plan].color} style={{ fontSize: 13 }}>{PLAN_META[plan].label}</Tag><Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>{PLAN_META[plan].blurb}</Text></Space>}
            >
              {items.map((feature) => (
                <FeatureRow
                  key={feature.key}
                  feature={feature}
                  saving={saving === feature.key}
                  editPlans={editPlans}
                  onToggle={(on) => save(feature.key, { features: { [feature.key]: on } }, `${feature.label} ${on ? 'switched on' : 'switched off'}`)}
                  onPlan={(level) => save(feature.key, { plans: { [feature.key]: level } }, `${feature.label} is now in ${PLAN_META[level].label}`)}
                />
              ))}
            </Card>
          ))}
        </Col>
        <Col xs={24} xl={11}>
          <AiAssistantCard enabled={aiOn} />
        </Col>
      </Row>
    </div>
  );
}

/** /admin/messages: Viber & WhatsApp messages. Free click-to-send; automatic WhatsApp is optional (Premium). */

import { useSearchParams } from 'react-router-dom';
import { Tabs, Typography } from 'antd';
import SendToListPanel from '@/features/messaging/SendToListPanel';
import TemplatesPanel from '@/features/messaging/TemplatesPanel';
import WhatsAppAutoPanel, { PremiumBadge } from '@/features/messaging/WhatsAppAutoPanel';

const TABS = ['send', 'templates', 'automatic'] as const;

export default function AdminMessagesPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t === params.get('tab')) ?? 'send';

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Viber & WhatsApp</Typography.Title>
      <Tabs
        activeKey={tab}
        onChange={(key) => setParams(key === 'send' ? {} : { tab: key }, { replace: true })}
        destroyOnHidden
        items={[
          { key: 'send', label: 'Send to a list', children: <SendToListPanel /> },
          { key: 'templates', label: 'Templates', children: <TemplatesPanel /> },
          { key: 'automatic', label: <span>Automatic <PremiumBadge /></span>, children: <WhatsAppAutoPanel /> },
        ]}
      />
    </div>
  );
}

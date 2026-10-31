/**
 * One-click Viber / WhatsApp message for admins: opens the app with a
 * ready-made message to the customer, who it is sent to from the business
 * account when the admin presses send. Free; nothing is sent automatically.
 */

import { useState } from 'react';
import { App, Button, Segmented, Space, Tooltip } from 'antd';
import { MessageOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { messageText, type MessageLanguage, type MessageTemplate } from './messageTemplates';
import { toInternationalPhone, viberUrl, whatsappUrl } from '@/shared/utils/messaging';

const LANGUAGE_KEY = 'tessa.admin.messageLanguage';

function storedLanguage(): MessageLanguage {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'sq' ? 'sq' : 'mk';
  } catch {
    return 'mk';
  }
}

interface SendMessageButtonsProps {
  phone?: string | null;
  template: MessageTemplate;
  size?: 'small' | 'middle';
}

export default function SendMessageButtons({ phone, template, size = 'small' }: SendMessageButtonsProps) {
  const { message } = App.useApp();
  const [language, setLanguage] = useState<MessageLanguage>(storedLanguage);
  const number = toInternationalPhone(phone);
  const text = messageText(template, language);

  const changeLanguage = (value: MessageLanguage) => {
    setLanguage(value);
    try { localStorage.setItem(LANGUAGE_KEY, value); } catch { /* per-device convenience only */ }
  };

  // Desktop Viber may open the chat without the draft, so the text is also copied.
  const copyForViber = () => {
    void navigator.clipboard?.writeText(text).then(
      () => message.info('Message copied. If Viber opens an empty chat, paste it.'),
      () => undefined,
    );
  };

  if (!number) {
    return <Tooltip title="No valid phone number"><Button size={size} disabled icon={<MessageOutlined />}>Message</Button></Tooltip>;
  }

  return (
    <Space size={4} wrap onClick={(event) => event.stopPropagation()} className="admin-send-message">
      <Segmented<MessageLanguage>
        size="small"
        value={language}
        onChange={changeLanguage}
        options={[{ value: 'mk', label: 'MK' }, { value: 'sq', label: 'SQ' }]}
        aria-label="Message language"
      />
      <Tooltip title={text}>
        <Button size={size} href={viberUrl(number, text)} onClick={copyForViber} icon={<MessageOutlined />} style={{ color: '#7360f2', borderColor: '#7360f2' }}>
          Viber
        </Button>
      </Tooltip>
      <Tooltip title={text}>
        <Button size={size} href={whatsappUrl(number, text)} target="_blank" rel="noopener noreferrer" icon={<WhatsAppOutlined />} style={{ color: '#128c4b', borderColor: '#25d366' }}>
          WhatsApp
        </Button>
      </Tooltip>
    </Space>
  );
}

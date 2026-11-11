/**
 * WhatsApp / Viber / Copy buttons for one person with a filled-in template.
 * Free: the app opens with the text written in; the admin presses send.
 */

import { useState } from 'react';
import { App, Button, Segmented, Space, Tooltip } from 'antd';
import { CopyOutlined, MessageOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { toInternationalPhone, viberUrl, whatsappUrl } from '@/shared/utils/messaging';
import { fillTemplate, LANGS, toLang, type Lang, type TemplateVars } from './templates';
import { useMessageTemplates } from './useMessageTemplates';

const LANGUAGE_KEY = 'tessa.admin.messageLanguage';

function storedLanguage(): Lang {
  try { return toLang(localStorage.getItem(LANGUAGE_KEY)); } catch { return 'mk'; }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

interface Props {
  phone?: string | null;
  templateKey: string;
  vars: TemplateVars;
  size?: 'small' | 'middle' | 'large';
}

export default function MessageButtons({ phone, templateKey, vars, size = 'middle' }: Props) {
  const { message } = App.useApp();
  const { find, shop, link } = useMessageTemplates();
  const [language, setLanguage] = useState<Lang>(storedLanguage);
  const number = toInternationalPhone(phone);
  const template = find(templateKey);
  const text = template ? fillTemplate(template[language], { shop, link, ...vars }) : '';

  const changeLanguage = (value: Lang) => {
    setLanguage(value);
    try { localStorage.setItem(LANGUAGE_KEY, value); } catch { /* per-device convenience */ }
  };

  const copy = async (hint?: string) => {
    const ok = await copyText(text);
    if (ok) message.info(hint ?? 'Message copied');
    else if (!hint) message.warning('Could not copy. Select the text and copy it by hand.');
  };

  return (
    <Space size={4} wrap onClick={(event) => event.stopPropagation()}>
      <Segmented<Lang>
        size="small"
        value={language}
        onChange={changeLanguage}
        options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
        aria-label="Message language"
      />
      {number ? (
        <>
          <Tooltip title={text}>
            <Button size={size} href={whatsappUrl(number, text)} target="_blank" rel="noopener noreferrer" icon={<WhatsAppOutlined />} style={{ color: '#128c4b', borderColor: '#25d366' }}>
              WhatsApp
            </Button>
          </Tooltip>
          <Tooltip title={text}>
            {/* Desktop Viber may open the chat without the draft, so the text is copied too. */}
            <Button size={size} href={viberUrl(number, text)} onClick={() => void copy('Message copied. If Viber opens an empty chat, paste it.')} icon={<MessageOutlined />} style={{ color: '#7360f2', borderColor: '#7360f2' }}>
              Viber
            </Button>
          </Tooltip>
        </>
      ) : (
        <Tooltip title="No valid phone number"><Button size={size} disabled icon={<MessageOutlined />}>No phone</Button></Tooltip>
      )}
      <Button size={size} icon={<CopyOutlined />} onClick={() => void copy()} disabled={!text}>Copy</Button>
    </Space>
  );
}

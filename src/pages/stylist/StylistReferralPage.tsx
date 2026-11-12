import { useRef, useState } from 'react';
import { Check, Copy, Download, Gift, Pencil, Share2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useGetMyReferralQuery, useRenameMyReferralCodeMutation } from '@/features/referrals/api';
import { formatPrice } from '@/shared/utils/formatPrice';
import { extractErrorMessage } from '@/shared/utils/error';
import { referralLink } from '@/shared/utils/referral';
import StatusBadge from '@/components/StatusBadge';
import { CatalogState, PageHeading, SectionHeading } from '@/components/storefront/DesignPrimitives';
import Seo from '@/shared/components/Seo';
import type { OrderStatus } from '@/types';

export default function StylistReferralPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error, refetch } = useGetMyReferralQuery();
  const [renameCode, { isLoading: renaming }] = useRenameMyReferralCodeMutation();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [editing, setEditing] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const locale = i18n.language === 'shq' ? 'sq' : i18n.language;

  if (!data) {
    return <><Seo title={t('referral.title')} description={t('referral.shortcutCopy')} noIndex /><CatalogState loading={isLoading} error={error} retry={() => void refetch()} /></>;
  }

  const { code, stats } = data;
  const link = referralLink(code.code);
  const shareText = t('referral.shareMessage', { discount: code.discountPercentage, code: code.code, link });

  const copy = async (value: string, what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch { /* clipboard blocked: the value stays visible to copy by hand */ }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareText, url: link }); } catch { /* cancelled */ }
    } else {
      void copy(shareText, 'link');
    }
  };

  const downloadQr = () => {
    const url = qrRef.current?.toDataURL('image/png');
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `tessa-${code.code}.png`;
    a.click();
  };

  const saveCode = async () => {
    setRenameError(null);
    try {
      await renameCode(newCode.trim().toUpperCase()).unwrap();
      setEditing(false);
    } catch (err) {
      setRenameError(extractErrorMessage(err));
    }
  };

  const tiles = [
    { label: t('referral.statBalance'), value: formatPrice(stats.balance), strong: true },
    { label: t('referral.statPending'), value: formatPrice(stats.pending) },
    { label: t('referral.statEarned'), value: formatPrice(stats.earned) },
    { label: t('referral.statClients'), value: String(stats.clients) },
    { label: t('referral.statOrders'), value: String(stats.orders) },
    { label: t('referral.statSales'), value: formatPrice(stats.clientSales) },
  ];

  return <>
    <Seo title={t('referral.title')} description={t('referral.subtitle')} noIndex />
    <PageHeading eyebrow={t('referral.eyebrow')} title={t('referral.title')} description={t('referral.subtitle', { discount: code.discountPercentage, commission: code.commissionPercentage })} />

    <div className="nl-referral-hero">
      <section className="nl-card nl-referral-code">
        <span className="nl-eyebrow">{t('referral.yourCode')}</span>
        {editing ? (
          <form className="nl-referral-rename" onSubmit={(e) => { e.preventDefault(); void saveCode(); }}>
            <input aria-label={t('referral.newCode')} value={newCode} maxLength={20} autoFocus onChange={(e) => setNewCode(e.target.value.toUpperCase())} />
            <div className="nl-button-row">
              <button className="nl-button" type="submit" disabled={renaming || newCode.trim().length < 4}>{t('common.save')}</button>
              <button className="nl-button nl-button-secondary" type="button" onClick={() => { setEditing(false); setRenameError(null); }}>{t('common.cancel')}</button>
            </div>
            <small>{renameError ?? t('referral.codeRules')}</small>
          </form>
        ) : (
          <div className="nl-referral-code-row">
            <strong>{code.code}</strong>
            <button type="button" className="nl-referral-icon" onClick={() => { setNewCode(code.code); setEditing(true); }} aria-label={t('referral.changeCode')}><Pencil size={16} /></button>
          </div>
        )}
        {!code.isActive && <p className="nl-referral-warning">{t('referral.inactive')}</p>}
        <p className="nl-referral-terms">
          {t('referral.terms', { discount: code.discountPercentage, commission: code.commissionPercentage })}
          {(code.maxCommission ?? 0) > 0 && <> {t('referral.termsCap', { max: formatPrice(code.maxCommission ?? 0) })}</>}
          {code.firstOrderOnly && <> {t('referral.firstOrderOnly')}</>}
        </p>
        <div className="nl-button-row">
          <button className="nl-button" type="button" onClick={() => void share()}><Share2 size={17} />{t('referral.share')}</button>
          <button className="nl-button nl-button-secondary" type="button" onClick={() => void copy(code.code, 'code')}>{copied === 'code' ? <Check size={17} /> : <Copy size={17} />}{t('referral.copyCode')}</button>
          <button className="nl-button nl-button-secondary" type="button" onClick={() => void copy(link, 'link')}>{copied === 'link' ? <Check size={17} /> : <Copy size={17} />}{t('referral.copyLink')}</button>
        </div>
        <div className="nl-referral-apps">
          <a href={`viber://forward?text=${encodeURIComponent(shareText)}`}>Viber</a>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </section>

      <section className="nl-card nl-referral-qr">
        <QRCodeCanvas ref={qrRef} value={link} size={176} marginSize={2} />
        <p>{t('referral.qrCopy')}</p>
        <button className="nl-button nl-button-secondary" type="button" onClick={downloadQr}><Download size={17} />{t('referral.downloadQr')}</button>
      </section>
    </div>

    <div className="nl-referral-stats">
      {tiles.map((tile) => <div key={tile.label} className={`nl-card${tile.strong ? ' is-strong' : ''}`}><span className="nl-eyebrow">{tile.label}</span><strong>{tile.value}</strong></div>)}
    </div>
    <p className="nl-referral-note"><Gift size={16} />{t('referral.creditNote')}</p>

    <SectionHeading eyebrow={t('referral.howEyebrow')} title={t('referral.howTitle')} />
    <ol className="nl-referral-steps">
      <li><strong>1</strong><span>{t('referral.step1')}</span></li>
      <li><strong>2</strong><span>{t('referral.step2', { discount: code.discountPercentage })}</span></li>
      <li><strong>3</strong><span>{t('referral.step3', { commission: code.commissionPercentage })}</span></li>
    </ol>

    <SectionHeading title={t('referral.clientOrders')} />
    {data.orders.length ? (
      <div className="nl-card nl-referral-table">
        {data.orders.map((order) => (
          <div key={order.id}>
            <span><strong>{order.client}</strong><small>{new Date(order.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</small></span>
            <StatusBadge status={order.status as OrderStatus} />
            <span>{formatPrice(order.goodsTotal)}</span>
            <strong className={order.status === 'cancelled' ? 'is-muted' : ''}>+{formatPrice(order.commission)}</strong>
          </div>
        ))}
      </div>
    ) : <p className="nl-referral-empty">{t('referral.noOrders')}</p>}

    {data.transactions.length > 0 && <>
      <SectionHeading title={t('referral.history')} />
      <div className="nl-card nl-referral-table">
        {data.transactions.map((row) => (
          <div key={row.id}>
            <span><strong>{t(`referral.type.${row.type}`)}{row.orderId ? ` · #${row.orderId}` : ''}</strong><small>{row.note || new Date(row.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</small></span>
            <strong className={row.amount < 0 ? 'is-negative' : ''}>{row.amount > 0 ? '+' : ''}{formatPrice(row.amount)}</strong>
          </div>
        ))}
      </div>
    </>}
  </>;
}

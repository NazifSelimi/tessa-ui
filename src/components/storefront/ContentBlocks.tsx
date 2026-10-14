import { Link } from 'react-router-dom';
import type { ContentBlock } from '@/features/admin/api';
import BundleDealRail from '@/components/BundleDealRail';

function BlockLink({ to, children }: { to?: string | null; children: React.ReactNode }) {
  if (!to) return <>{children}</>;
  if (to.startsWith('/')) return <Link className="nl-button nl-button-dark" to={to}>{children}</Link>;
  if (to.startsWith('https://')) return <a className="nl-button nl-button-dark" href={to} target="_blank" rel="noreferrer">{children}</a>;
  return <>{children}</>;
}

export default function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  if (!blocks.length) return null;

  return <>
    {blocks.map((block) => block.kind === 'bundle_rail'
      ? <BundleDealRail key={block.id} showEmpty />
      : <section key={block.id} className={block.kind === 'hero' ? 'nl-professional-invite' : 'nl-section'}>
      {block.imageUrl && <img src={block.imageUrl} alt="" style={{ width: block.kind === 'hero' ? 180 : '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 12 }} />}
      <div style={{ width: '100%' }}>
        {block.eyebrow && <span className="nl-eyebrow">{block.eyebrow}</span>}
        {block.title && <h2>{block.title}</h2>}
        {block.body && <p>{block.body}</p>}
        {block.items.length > 0 && <div className="nl-concern-grid" style={{ marginTop: 20 }}>
          {block.items.map((item, index) => <article className={`nl-concern nl-concern-${(index % 4) + 1}`} key={`${block.id}-${index}`}>
            {item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />}
            {item.title && <strong>{item.title}</strong>}
            {item.body && <small style={{ display: 'block', marginTop: 6 }}>{item.body}</small>}
            <BlockLink to={item.actionUrl}>{item.actionLabel || ''}</BlockLink>
          </article>)}
        </div>}
        {block.actionLabel && <BlockLink to={block.actionUrl}>{block.actionLabel}</BlockLink>}
      </div>
    </section>)}
  </>;
}

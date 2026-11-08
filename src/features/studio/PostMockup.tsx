/**
 * Shows the post the way followers will see it: an Instagram feed card, a
 * Facebook post or a story frame, with the caption cut where the network cuts
 * it ("… more" / "See more"). The canvas is passed in as children so dragging,
 * resizing and cropping keep working inside the preview.
 */
import { useState, type ReactNode } from 'react';
import { Bookmark, Globe, Heart, MessageCircle, MoreHorizontal, Send, Share2, ThumbsUp } from 'lucide-react';
import { previewCut, type Platform } from './caption';
import type { FormatId } from './render';

interface PostMockupProps {
  platform: Platform;
  format: FormatId;
  handle: string;
  pageName: string;
  caption: string;
  children: ReactNode;
}

const initials = (text: string) => (text.trim().replace(/^@/, '')[0] ?? '•').toUpperCase();

export default function PostMockup({ platform, format, handle, pageName, caption, children }: PostMockupProps) {
  const [expanded, setExpanded] = useState(false);
  const cleanHandle = handle.trim().replace(/^@/, '') || 'yourshop';
  const name = pageName.trim() || cleanHandle;

  if (format === 'story') {
    return (
      <div className="post-mockup post-mockup--story">
        <div className="post-mockup__story-bar"><span /></div>
        <div className="post-mockup__story-head">
          <span className="post-mockup__avatar post-mockup__avatar--small">{initials(platform === 'instagram' ? cleanHandle : name)}</span>
          <strong>{platform === 'instagram' ? cleanHandle : name}</strong>
          <small>now</small>
        </div>
        <div className="post-mockup__media">{children}</div>
        <div className="post-mockup__story-reply">
          <span>{platform === 'instagram' ? 'Send message' : 'Reply…'}</span>
          <Heart size={20} />
          <Send size={20} />
        </div>
      </div>
    );
  }

  if (platform === 'facebook') {
    const [visible, isCut] = previewCut(caption, 'facebook');
    return (
      <div className="post-mockup post-mockup--facebook">
        <div className="post-mockup__head">
          <span className="post-mockup__avatar">{initials(name)}</span>
          <div>
            <strong>{name}</strong>
            <small>Just now · <Globe size={11} /></small>
          </div>
          <MoreHorizontal size={18} className="post-mockup__more" />
        </div>
        {caption.trim() && (
          <p className="post-mockup__caption post-mockup__caption--above">
            {expanded || !isCut ? caption : visible}
            {isCut && !expanded && <>… <button type="button" onClick={() => setExpanded(true)}>See more</button></>}
          </p>
        )}
        <div className="post-mockup__media">{children}</div>
        <div className="post-mockup__fb-actions">
          <span><ThumbsUp size={17} /> Like</span>
          <span><MessageCircle size={17} /> Comment</span>
          <span><Share2 size={17} /> Share</span>
        </div>
      </div>
    );
  }

  const [visible, isCut] = previewCut(caption, 'instagram');
  return (
    <div className="post-mockup post-mockup--instagram">
      <div className="post-mockup__head">
        <span className="post-mockup__avatar post-mockup__avatar--ring">{initials(cleanHandle)}</span>
        <div><strong>{cleanHandle}</strong></div>
        <MoreHorizontal size={18} className="post-mockup__more" />
      </div>
      <div className="post-mockup__media">{children}</div>
      <div className="post-mockup__ig-actions">
        <Heart size={22} />
        <MessageCircle size={22} />
        <Send size={22} />
        <Bookmark size={22} className="post-mockup__save" />
      </div>
      {caption.trim() && (
        <p className="post-mockup__caption">
          <strong>{cleanHandle}</strong>{' '}
          {expanded || !isCut ? caption : visible}
          {isCut && !expanded && <>… <button type="button" onClick={() => setExpanded(true)}>more</button></>}
          {expanded && isCut && <> <button type="button" onClick={() => setExpanded(false)}>less</button></>}
        </p>
      )}
      <small className="post-mockup__time">Just now</small>
    </div>
  );
}

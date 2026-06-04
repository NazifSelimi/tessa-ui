/**
 * HScrollRail — horizontal scroll-snap primitive.
 *
 * Native overflow scrolling (no carousel library) for mobile-first rails:
 * featured products, hair-type chips, concern chips, etc. Children control
 * their own width; the rail handles snapping, spacing, and edge padding.
 */

import type { ReactNode, CSSProperties } from 'react';

interface HScrollRailProps {
  children: ReactNode;
  /** Gap between items (CSS length). Defaults to var(--spacing-md). */
  gap?: string;
  /** Extra className for the scroller. */
  className?: string;
  style?: CSSProperties;
}

export default function HScrollRail({ children, gap = 'var(--spacing-md)', className, style }: HScrollRailProps) {
  return (
    <div
      className={`hscroll-rail${className ? ` ${className}` : ''}`}
      style={{ gap, ...style }}
      role="list"
    >
      {children}
    </div>
  );
}

import { Tag, Tooltip } from 'antd';
import type { ProductAudience } from '@/types';
import { visibilitySummary } from '@/shared/utils/productVisibility';

/** Admin tag saying who can see a product in the shop: Everyone, "Stylists only", Hidden. */
export default function AudienceTag({ visibleTo }: { visibleTo?: ProductAudience[] | null }) {
  if (!Array.isArray(visibleTo)) return null;
  const summary = visibilitySummary(visibleTo);
  const color = summary.everyone ? 'green' : summary.color;
  return (
    <Tooltip title="Who can see this product in the shop">
      <Tag color={color} style={{ marginInlineEnd: 0 }}>{summary.label}</Tag>
    </Tooltip>
  );
}

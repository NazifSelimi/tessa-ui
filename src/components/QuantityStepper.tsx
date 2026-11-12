import { Button, InputNumber, Space } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface QuantityStepperProps {
  value: number;
  onChange: (quantity: number) => void;
  /** Highest quantity allowed (stock). Falls back to 1 when stock is unknown or 0. */
  max?: number | null;
  /** Product name for the screen-reader labels. */
  name: string;
  size?: 'small' | 'middle' | 'large';
}

/**
 * − [n] + quantity control used everywhere in the shop. Ant Design's own arrows only
 * appear on mouse hover, so phone users could not change the amount without typing.
 */
export default function QuantityStepper({ value, onChange, max, name, size = 'middle' }: QuantityStepperProps) {
  const { t } = useTranslation();
  const limit = Math.max(1, max || 1);
  const set = (next: number | null) => onChange(Math.min(limit, Math.max(1, Math.round(next || 1))));
  const width = size === 'small' ? 44 : size === 'large' ? 56 : 48;

  return (
    <Space.Compact size={size} className="quantity-stepper">
      <Button
        icon={<MinusOutlined />}
        onClick={() => set(value - 1)}
        disabled={value <= 1}
        aria-label={t('newLook.decrease', { name })}
      />
      <InputNumber
        controls={false}
        min={1}
        max={limit}
        value={value}
        onChange={set}
        inputMode="numeric"
        style={{ width, textAlign: 'center' }}
        aria-label={t('cart.quantityFor', { name })}
      />
      <Button
        icon={<PlusOutlined />}
        onClick={() => set(value + 1)}
        disabled={value >= limit}
        aria-label={t('newLook.increase', { name })}
      />
    </Space.Compact>
  );
}

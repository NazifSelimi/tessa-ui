import { App, Card, Switch, Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useGetCategoriesQuery } from '@/features/products/api';
import { useUpdateCategoryMutation } from '@/features/admin/api';
import { extractErrorMessage } from '@/shared/utils/error';
import type { Category } from '@/types';

const { Title, Paragraph } = Typography;

/**
 * Admin → Categories: tick which categories are hair colour (owner rule Q11).
 * "Restock colours" in Quick order shows products of the ticked categories;
 * while none is ticked, the shop guesses from the category names.
 */
export default function AdminCategoriesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { data: categories = [], isLoading } = useGetCategoriesQuery();
  const [updateCategory, { isLoading: saving }] = useUpdateCategoryMutation();

  const setHairColour = async (category: Category, value: boolean) => {
    const data = new FormData();
    data.append('name', category.name);
    data.append('is_hair_colour', value ? '1' : '0');
    try {
      await updateCategory({ id: category.id, data }).unwrap();
      message.success(t('adminCategories.saved'));
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  return (
    <div>
      <Title level={3}>{t('adminCategories.title')}</Title>
      <Paragraph type="secondary">{t('adminCategories.intro')}</Paragraph>
      <Card size="small">
        <Table<Category>
          rowKey="id"
          loading={isLoading}
          dataSource={categories}
          pagination={false}
          columns={[
            { title: t('adminCategories.name'), dataIndex: 'name' },
            {
              title: t('adminCategories.isHairColour'),
              key: 'isHairColour',
              width: 160,
              render: (_: unknown, category: Category) => (
                <Switch
                  checked={Boolean(category.isHairColour)}
                  loading={saving}
                  onChange={(value) => void setHairColour(category, value)}
                  aria-label={`${t('adminCategories.isHairColour')}: ${category.name}`}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

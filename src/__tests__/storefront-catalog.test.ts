import { describe, expect, it } from 'vitest';
import { storefrontBrandName, storefrontCategoryName, storefrontImageUrl, storefrontPhotos, visibleBrands, visibleCategories } from '@/shared/utils/storefrontCatalog';
import type { Brand, Category, ProductMediaAsset } from '@/types';

describe('storefront catalogue display rules', () => {
  it('hides the importer fallback brand and internal review category', () => {
    expect(storefrontBrandName({ brand: { id: '27', name: 'Supplier catalogue' } as Brand })).toBe('');
    expect(storefrontBrandName({ brand: { id: '1', name: 'ORO THERAPY' } as Brand })).toBe('ORO THERAPY');
    expect(storefrontCategoryName({ category: { id: '65', name: 'Catalogue review' } as Category })).toBe('');
    expect(storefrontCategoryName({ category: 'Spray' as unknown as Category })).toBe('Spray');
  });

  it('skips the pending-review placeholder and keeps real images', () => {
    const placeholder = 'https://staging.tessa.mk/storage/images/catalog-placeholders/pdf-product.svg';
    expect(storefrontImageUrl({ image: placeholder, images: [placeholder] })).toBeUndefined();
    expect(storefrontImageUrl({ image: placeholder, images: ['/storage/images/oro.webp'] })).toBe('/storage/images/oro.webp');
  });

  it('filters internal entries from shop filter lists', () => {
    expect(visibleBrands([{ id: '27', name: 'Supplier catalogue' }, { id: '2', name: 'Fanola' }] as Brand[]).map(b => b.name)).toEqual(['Fanola']);
    expect(visibleCategories([{ id: '65', name: 'Catalogue review' }, { id: '3', name: 'Mask' }] as Category[]).map(c => c.name)).toEqual(['Mask']);
  });

  it('lists each photo once: detail copies and tessa.mk photos, not the original or card copies', () => {
    const asset = (url: string, variant: ProductMediaAsset['variant']) => ({ url, variant, alt: null, background: 'unknown', reviewStatus: 'ready', sortOrder: 0 }) as ProductMediaAsset;
    const media = [asset('/front-detail.webp', 'detail'), asset('/front-card.webp', 'card'), asset('/front-original.webp', 'original'), asset('/tessa.webp', 'legacy')];
    expect(storefrontPhotos(media).map(a => a.url)).toEqual(['/front-detail.webp', '/tessa.webp']);
    expect(storefrontPhotos([asset('/only-original.webp', 'original'), asset('/only-card.webp', 'card')]).map(a => a.url)).toEqual(['/only-original.webp']);
    expect(storefrontPhotos(null)).toEqual([]);
  });
});

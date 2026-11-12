/**
 * The brand kit Post Studio draws with: name, web address, colours and fonts.
 * Read from the site config today; when the admin Business profile is
 * available, only this file needs to change.
 */
import { site } from '@/shared/config/site';

export interface BrandKit {
  name: string;
  url: string;
  host: string;
  primary: string;
  ink: string;
  fonts: { serif: string; sans: string };
}

export function getBrandKit(): BrandKit {
  const url = site.url.replace(/\/$/, '');
  return {
    name: site.name,
    url,
    host: url.replace(/^https?:\/\//, ''),
    primary: '#9b5364',
    ink: '#242124',
    fonts: {
      serif: "'Fraunces', 'DM Serif Display', Georgia, 'Times New Roman', serif",
      sans: "'Manrope', 'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    },
  };
}

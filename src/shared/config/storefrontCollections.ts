import type { LucideIcon } from 'lucide-react';
import { Palette, Scissors, ShieldPlus, Sparkles, Waves, Wind } from 'lucide-react';
import type { ProductCollection } from '@/types';

export type StorefrontCollectionSlug =
  | 'blonde-and-tone'
  | 'repair'
  | 'curls'
  | 'smooth-and-anti-frizz'
  | 'colour'
  | 'extensions-and-tools';

export interface StorefrontCollectionDefinition {
  slug: StorefrontCollectionSlug;
  name: string;
  title: string;
  description: string;
  sortPriority: number;
  defaultRoutineRoles: string[];
  supportedCategoryNames: string[];
  outcomeDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  placeholderTitle: string;
  placeholderBody: string;
  launchState: 'live' | 'planned';
  icon: LucideIcon;
  palette: {
    surface: string;
    border: string;
    accent: string;
    ink: string;
    glow: string;
  };
}

export interface StorefrontCollectionDirectoryItem extends StorefrontCollectionDefinition {
  routineRoles: string[];
  productCount?: number;
}

interface RoutineRoleCopy {
  label: string;
  intro: string;
  microcopy: string;
}

const DEFINITIONS: StorefrontCollectionDefinition[] = [
  {
    slug: 'blonde-and-tone',
    name: 'Blonde and Tone',
    title: 'Blonde and Tone',
    description: 'Tone brassiness, keep blonde bright and care for lightened hair.',
    sortPriority: 10,
    defaultRoutineRoles: ['cleanse', 'tone', 'nourish', 'protect'],
    supportedCategoryNames: ['Shampoo', 'Mask', 'Hair Color', 'Bleach and De Color'],
    outcomeDescription: 'Cool blonde maintenance first, with stylist-safe technical guidance kept separate.',
    heroEyebrow: 'Blonde care',
    heroTitle: 'Cool, bright blonde without the brass.',
    heroBody: 'Shampoos, masks and toners that keep blonde and highlighted hair fresh between salon visits.',
    placeholderTitle: 'Approved blonde result image slot',
    placeholderBody: 'Temporary until Tessa confirms client and artist permission for the selected real-result hero.',
    launchState: 'live',
    icon: Sparkles,
    palette: {
      surface: '#fff8ef',
      border: '#efcf9a',
      accent: '#b87c13',
      ink: '#3d2d0a',
      glow: 'radial-gradient(circle at top right, rgba(255, 215, 144, 0.55), transparent 55%)',
    },
  },
  {
    slug: 'repair',
    name: 'Repair',
    title: 'Repair damaged hair',
    description: 'Rebuild and soften damaged, dry or stressed hair.',
    sortPriority: 20,
    defaultRoutineRoles: ['cleanse', 'repair', 'nourish', 'protect'],
    supportedCategoryNames: ['Shampoo', 'Mask', 'Filler', 'Spray', 'Fluid'],
    outcomeDescription: 'Rebuild stressed lengths with clean roles for wash day, treatment, and leave-in support.',
    heroEyebrow: 'Repair',
    heroTitle: 'Bring dry, damaged hair back to life.',
    heroBody: 'Shampoos, masks and treatments that rebuild strength, soften and add shine.',
    placeholderTitle: 'Repair campaign image slot',
    placeholderBody: 'Temporary slot for an approved repair-result visual and current packshot set.',
    launchState: 'planned',
    icon: ShieldPlus,
    palette: {
      surface: '#f3fbf4',
      border: '#b9ddc0',
      accent: '#2e7d46',
      ink: '#173121',
      glow: 'radial-gradient(circle at top right, rgba(130, 214, 156, 0.35), transparent 58%)',
    },
  },
  {
    slug: 'curls',
    name: 'Curls',
    title: 'Care for curls',
    description: 'Keep curls hydrated, defined, and easy to refresh between washes.',
    sortPriority: 30,
    defaultRoutineRoles: ['cleanse', 'nourish', 'define', 'protect'],
    supportedCategoryNames: ['Shampoo', 'Mask', 'Styling', 'Spray'],
    outcomeDescription: 'Hydrate, define, and refresh curls with a routine customers can understand at a glance.',
    heroEyebrow: 'Curls & waves',
    heroTitle: 'Soft, defined curls every day.',
    heroBody: 'Hydrating care and styling that keeps curls bouncy and easy to refresh between washes.',
    placeholderTitle: 'Curls campaign image slot',
    placeholderBody: 'Temporary slot for approved curl-result and routine imagery.',
    launchState: 'planned',
    icon: Waves,
    palette: {
      surface: '#eef8ff',
      border: '#b7d7ec',
      accent: '#0a759a',
      ink: '#102a38',
      glow: 'radial-gradient(circle at top right, rgba(101, 188, 229, 0.35), transparent 58%)',
    },
  },
  {
    slug: 'smooth-and-anti-frizz',
    name: 'Smooth and Anti-frizz',
    title: 'Smooth and Anti-frizz',
    description: 'Reduce frizz, protect against heat, and keep the finish polished.',
    sortPriority: 40,
    defaultRoutineRoles: ['cleanse', 'nourish', 'smooth', 'protect'],
    supportedCategoryNames: ['Fluid', 'Spray', 'Styling'],
    outcomeDescription: 'Translate internal fluid and spray classes into a smoother, anti-frizz finish story.',
    heroEyebrow: 'Smooth & shiny',
    heroTitle: 'Less frizz, more shine.',
    heroBody: 'Smoothing care, heat protection and finishing products for a polished look.',
    placeholderTitle: 'Smooth and Anti-frizz image slot',
    placeholderBody: 'Temporary slot for approved smoothing-result imagery and supporting product media.',
    launchState: 'planned',
    icon: Wind,
    palette: {
      surface: '#f7f4ff',
      border: '#d4c9f3',
      accent: '#6e52ad',
      ink: '#291c42',
      glow: 'radial-gradient(circle at top right, rgba(180, 154, 255, 0.3), transparent 58%)',
    },
  },
  {
    slug: 'colour',
    name: 'Colour',
    title: 'Colour services and care',
    description: 'Professional hair colour and the care that keeps it vibrant.',
    sortPriority: 50,
    defaultRoutineRoles: ['tone', 'protect', 'repair'],
    supportedCategoryNames: ['Hair Color', 'Hydrogen Peroxide', 'Activator', 'Bleach and De Color'],
    outcomeDescription: 'Separate customer-facing colour maintenance from stylist-only technical system decisions.',
    heroEyebrow: 'Colour care',
    heroTitle: 'Colour that stays vibrant for longer.',
    heroBody: 'Professional colour and the care that protects it after every salon visit.',
    placeholderTitle: 'Colour campaign image slot',
    placeholderBody: 'Temporary slot for approved colour service imagery and verified system visuals.',
    launchState: 'planned',
    icon: Palette,
    palette: {
      surface: '#fff3f1',
      border: '#efc2bb',
      accent: '#c65b40',
      ink: '#3d1f1a',
      glow: 'radial-gradient(circle at top right, rgba(255, 155, 123, 0.3), transparent 58%)',
    },
  },
  {
    slug: 'extensions-and-tools',
    name: 'Extensions and Tools',
    title: 'Extensions and Tools',
    description: 'Extensions, brushes and tools for everyday styling.',
    sortPriority: 60,
    defaultRoutineRoles: ['protect'],
    supportedCategoryNames: ['Extensions', 'Brushes and Tools'],
    outcomeDescription: 'Reserve a clear destination for extension care, tools, and new inventory once it is fully verified.',
    heroEyebrow: 'Extensions & tools',
    heroTitle: 'The right tools for great hair.',
    heroBody: 'Extensions, brushes and styling tools picked by professionals.',
    placeholderTitle: 'Extensions and tools image slot',
    placeholderBody: 'Temporary slot for approved extension and tool imagery once the assortment is reviewed.',
    launchState: 'planned',
    icon: Scissors,
    palette: {
      surface: '#f6f5f2',
      border: '#d8d3c5',
      accent: '#6c6451',
      ink: '#2f2b23',
      glow: 'radial-gradient(circle at top right, rgba(197, 190, 170, 0.35), transparent 58%)',
    },
  },
];

const DEFAULT_ROLE_COPY: Record<string, RoutineRoleCopy> = {
  cleanse: {
    label: 'Cleanse',
    intro: 'Start with the wash step that sets up the rest of the routine.',
    microcopy: 'The first product should make the outcome clearer, not more technical.',
  },
  tone: {
    label: 'Tone',
    intro: 'Neutralise unwanted tones and refresh colour.',
    microcopy: 'Helpful for brass control, brightness, and colour maintenance stories.',
  },
  nourish: {
    label: 'Nourish',
    intro: 'Follow with softness, slip, and maintenance support.',
    microcopy: 'This is where masks and conditioners earn their place in the routine.',
  },
  protect: {
    label: 'Protect',
    intro: 'Finish with care that helps the result last longer between appointments.',
    microcopy: 'Use protection language for heat, breakage, or colour-preserving support.',
  },
  repair: {
    label: 'Repair',
    intro: 'Rebuild strength in weak, damaged hair.',
    microcopy: 'Reserve this role for reconstructing or bond-support moments.',
  },
  define: {
    label: 'Define',
    intro: 'Shape and hold for defined styles.',
    microcopy: 'This keeps curl definition distinct from basic hydration.',
  },
  smooth: {
    label: 'Smooth',
    intro: 'Tame frizz and add a smooth, glossy finish.',
    microcopy: 'This is the benefit-led home for smoothing fluids and glossing support.',
  },
};

const BLONDE_ROLE_COPY: Record<string, RoutineRoleCopy> = {
  cleanse: {
    label: 'Cleanse',
    intro: 'A gentle wash made for blonde and lightened hair.',
    microcopy: 'Purple-cleanse steps should feel home-safe and easy to repeat.',
  },
  tone: {
    label: 'Tone',
    intro: 'Cool down brassy and yellow tones.',
    microcopy: 'For retail customers, this stays focused on maintenance rather than salon ratios.',
  },
  nourish: {
    label: 'Nourish',
    intro: 'Softness and shine after toning.',
    microcopy: 'Masks and post-tone care keep the story result-led instead of category-led.',
  },
  protect: {
    label: 'Protect',
    intro: 'Protect fragile lengths after lightening.',
    microcopy: 'Technical substitutions stay out of this block until they are verified for stylists.',
  },
};

export const STOREFRONT_COLLECTION_ORDER = DEFINITIONS.map((definition) => definition.slug);

export const STOREFRONT_COLLECTION_DEFINITIONS = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.slug, definition]),
) as Record<StorefrontCollectionSlug, StorefrontCollectionDefinition>;

export function isStorefrontCollectionSlug(value: string): value is StorefrontCollectionSlug {
  return STOREFRONT_COLLECTION_ORDER.includes(value as StorefrontCollectionSlug);
}

export function buildStorefrontCollectionDirectory(
  collections: ProductCollection[] = [],
): StorefrontCollectionDirectoryItem[] {
  const bySlug = new Map(collections.map((collection) => [collection.slug, collection]));

  return DEFINITIONS.map((definition) => {
    const apiCollection = bySlug.get(definition.slug);

    return {
      ...definition,
      slug: definition.slug,
      name: apiCollection?.name ?? definition.name,
      title: apiCollection?.title ?? definition.title,
      description: apiCollection?.description ?? definition.description,
      sortPriority: apiCollection?.sortPriority ?? definition.sortPriority,
      routineRoles: apiCollection?.routineRoles ?? definition.defaultRoutineRoles,
      supportedCategoryNames: apiCollection?.supportedCategoryNames ?? definition.supportedCategoryNames,
      productCount: apiCollection?.productCount,
    };
  });
}

export function getRoutineRoleCopy(role: string, slug?: StorefrontCollectionSlug): RoutineRoleCopy {
  if (slug === 'blonde-and-tone' && BLONDE_ROLE_COPY[role]) {
    return BLONDE_ROLE_COPY[role];
  }

  return DEFAULT_ROLE_COPY[role] ?? {
    label: role,
    intro: 'Use this role to keep the collection understandable at a glance.',
    microcopy: 'Roles stay visible even while deeper product mapping continues behind the scenes.',
  };
}

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
    description: 'Tone brassiness, maintain brightness, and support blonde routines with verified Fanola-family products.',
    sortPriority: 10,
    defaultRoutineRoles: ['cleanse', 'tone', 'nourish', 'protect'],
    supportedCategoryNames: ['Shampoo', 'Mask', 'Hair Color', 'Bleach and De Color'],
    outcomeDescription: 'Cool blonde maintenance first, with stylist-safe technical guidance kept separate.',
    heroEyebrow: 'First verified release',
    heroTitle: 'Cool blonde care without the brass-first guesswork.',
    heroBody: 'Start with the Blonde and Tone campaign: home-safe maintenance up front, verified technical pairing only where stylist guidance applies.',
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
    description: 'Support damaged or stressed hair with rebuilding routines and verified aftercare.',
    sortPriority: 20,
    defaultRoutineRoles: ['cleanse', 'repair', 'nourish', 'protect'],
    supportedCategoryNames: ['Shampoo', 'Mask', 'Filler', 'Spray', 'Fluid'],
    outcomeDescription: 'Rebuild stressed lengths with clean roles for wash day, treatment, and leave-in support.',
    heroEyebrow: 'Preparing next',
    heroTitle: 'Repair routines built around recovery, not product jargon.',
    heroBody: 'This path is reserved for damage-recovery routines once the reviewed product list and current imagery are locked.',
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
    heroEyebrow: 'Preparing next',
    heroTitle: 'Curl care should read like a routine, not a shelf map.',
    heroBody: 'This collection shell is ready to receive verified curl products, approved imagery, and clear refresh-day copy.',
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
    heroEyebrow: 'Preparing next',
    heroTitle: 'Smooth, seal, and protect the finish with less frizz language overhead.',
    heroBody: 'The route is ready, but launch waits for verified smoothing products and current approved imagery.',
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
    description: 'Keep colour services tied to verified technical systems and safe maintenance.',
    sortPriority: 50,
    defaultRoutineRoles: ['tone', 'protect', 'repair'],
    supportedCategoryNames: ['Hair Color', 'Hydrogen Peroxide', 'Activator', 'Bleach and De Color'],
    outcomeDescription: 'Separate customer-facing colour maintenance from stylist-only technical system decisions.',
    heroEyebrow: 'Preparing next',
    heroTitle: 'Colour starts with verified systems and careful aftercare.',
    heroBody: 'This collection route stays reserved until reviewed technical pairings, product copy, and current assets are ready.',
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
    description: 'A launch placeholder for verified extension and tool inventory as it is added.',
    sortPriority: 60,
    defaultRoutineRoles: ['protect'],
    supportedCategoryNames: ['Extensions', 'Brushes and Tools'],
    outcomeDescription: 'Reserve a clear destination for extension care, tools, and new inventory once it is fully verified.',
    heroEyebrow: 'Inventory intake first',
    heroTitle: 'Extensions and tools need verified inventory before visual launch.',
    heroBody: 'This collection remains a storefront-ready placeholder until Tessa confirms the sellable range, specs, and current media.',
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
    intro: 'Use the role that shifts the visible result, not just the category name.',
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
    intro: 'Show the rebuilding step separately from the wash and finish.',
    microcopy: 'Reserve this role for reconstructing or bond-support moments.',
  },
  define: {
    label: 'Define',
    intro: 'Put shape and hold in a dedicated styling step.',
    microcopy: 'This keeps curl definition distinct from basic hydration.',
  },
  smooth: {
    label: 'Smooth',
    intro: 'Surface finishing and anti-frizz support deserve their own role.',
    microcopy: 'This is the benefit-led home for smoothing fluids and glossing support.',
  },
};

const BLONDE_ROLE_COPY: Record<string, RoutineRoleCopy> = {
  cleanse: {
    label: 'Cleanse',
    intro: 'Begin with the blonde-safe wash that keeps the routine approachable.',
    microcopy: 'Purple-cleanse steps should feel home-safe and easy to repeat.',
  },
  tone: {
    label: 'Tone',
    intro: 'Use the tone step to address brassiness without turning the page into a technical sheet.',
    microcopy: 'For retail customers, this stays focused on maintenance rather than salon ratios.',
  },
  nourish: {
    label: 'Nourish',
    intro: 'Blonde maintenance needs softness after toning, not just pigment correction.',
    microcopy: 'Masks and post-tone care keep the story result-led instead of category-led.',
  },
  protect: {
    label: 'Protect',
    intro: 'Finish with care that supports fragile blonde lengths and post-lightening feel.',
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

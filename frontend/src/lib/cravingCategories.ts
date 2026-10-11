import { Pizza, Film, Heart, ShoppingBag, MoreHorizontal } from 'lucide-react';

// One color per craving category, used everywhere that category appears (Cravings page, dashboard)
export const CATEGORIES = [
  { value: 'Food', icon: Pizza, label: 'Food', iconColor: 'text-amber-400', tint: 'bg-amber-400/10 border-amber-400/30 text-amber-200' },
  { value: 'Activity', icon: Film, label: 'Activity', iconColor: 'text-sky-400', tint: 'bg-sky-400/10 border-sky-400/30 text-sky-200' },
  { value: 'Emotional', icon: Heart, label: 'Emotional', iconColor: 'text-rose-400', tint: 'bg-rose-400/10 border-rose-400/30 text-rose-200' },
  { value: 'Material', icon: ShoppingBag, label: 'Material', iconColor: 'text-violet-400', tint: 'bg-violet-400/10 border-violet-400/30 text-violet-200' },
  { value: 'Other', icon: MoreHorizontal, label: 'Other', iconColor: 'text-neutral-400', tint: 'bg-neutral-400/10 border-neutral-400/30 text-neutral-200' },
];
export type Category = (typeof CATEGORIES)[number];

export const categoryFor = (value: string | null | undefined): Category =>
  CATEGORIES.find((x) => x.value === (value || 'Other')) ?? CATEGORIES[CATEGORIES.length - 1];

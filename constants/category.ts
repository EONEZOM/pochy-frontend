export const COSMETIC_CATEGORIES = [
  { label: 'Face', value: 'Face' },
  { label: 'Eyes', value: 'Eyes' },
  { label: 'Lip', value: 'Lip' },
  { label: 'Brow', value: 'Brow' },
  { label: 'Etc', value: 'Etc' },
] as const

export const FILTER_CATEGORIES = [
  { label: 'All', value: 'All' },
  ...COSMETIC_CATEGORIES,
] as const

export type CosmeticCategory = (typeof COSMETIC_CATEGORIES)[number]['value']

export type FilterCategory = CosmeticCategory | 'All'

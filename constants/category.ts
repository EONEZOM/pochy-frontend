export const COSMETIC_CATEGORIES = [
  { label: '페이스', value: 'Face' },
  { label: '아이', value: 'Eyes' },
  { label: '립', value: 'Lip' },
  { label: '브로우', value: 'Brow' },
  { label: '기타', value: 'Etc' },
] as const

export type CosmeticCategory = (typeof COSMETIC_CATEGORIES)[number]['value']

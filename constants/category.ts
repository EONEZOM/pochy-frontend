export const COSMETIC_CATEGORIES = [
  {
    label: '베이스 메이크업',
    value: 'Base',
    subCategories: [
      { label: '하이라이터', value: 'Highlighter' },
      { label: '블러셔/치크', value: 'Blusher' },
      { label: '컨실러', value: 'Concealer' },
      { label: '파운데이션/BB', value: 'Foundation' },
      { label: '프라이머/베이스/톤업', value: 'Primer' },
      { label: '쿠션 파운데이션', value: 'Cushion' },
      { label: '파우더/팩트', value: 'Powder' },
      { label: '쉐딩', value: 'Shading' },
      { label: '픽서', value: 'Fixer' },
    ],
  },
  {
    label: '아이 메이크업',
    value: 'Eyes',
    subCategories: [
      { label: '아이섀도우/팔레트', value: 'Shadow' },
      { label: '아이라이너', value: 'Eyeliner' },
      { label: '마스카라/속눈썹', value: 'Mascara' },
      { label: '아이브로우', value: 'Eyebrow' },
    ],
  },
  {
    label: '립 메이크업',
    value: 'Lip',
    subCategories: [
      { label: '립글로스', value: 'LipGloss' },
      { label: '립스틱', value: 'Lipstick' },
      { label: '틴트', value: 'Tint' },
      { label: '립밤', value: 'LipBalm' },
    ],
  },
  {
    label: '스킨케어',
    value: 'SkinCare',
    subCategories: [
      { label: '아이크림/멀티밤', value: 'EyeCream' },
      { label: '로션/에멀전/크림', value: 'Lotion' },
      { label: '스킨/토너', value: 'Skin' },
      { label: '에센스/세럼/앰플', value: 'Essence' },
      { label: '패드/미스트', value: 'Pad' },
    ],
  },
  {
    label: '선 케어',
    value: 'SunCare',
    subCategories: [
      { label: '선크림', value: 'SunScreen' },
      { label: '선스틱', value: 'SunStick' },
    ],
  },
  {
    label: '기타',
    value: 'Etc',
    subCategories: [{ label: '기타', value: 'Other' }],
  },
] as const

/**
 * 필터 UI 전용 데이터 (All 옵션 포함)
 * 대분류 전체와 각 대분류별 소분류 전체를 미리 가공
 */
export const FILTER_CATEGORIES = [
  {
    label: '전체',
    value: 'All',
    subCategories: [],
  },
  ...COSMETIC_CATEGORIES.map((category) => ({
    ...category,
    subCategories: [{ label: '전체', value: 'All' }, ...category.subCategories],
  })),
]

export const CATEGORY_SPECS = COSMETIC_CATEGORIES.map(
  (main) =>
    `- 대분류 '${main.label}' (value: '${main.value}'): [${main.subCategories.map((sub) => `'${sub.label}' (value: '${sub.value}')`).join(', ')}]`,
).join('\n')

// 저장용 순수 타입
export type MainCategory = (typeof COSMETIC_CATEGORIES)[number]['value']
export type SubCategory =
  (typeof COSMETIC_CATEGORIES)[number]['subCategories'][number]['value']

// 필터 UI 상태 관리용 타입
export type FilterMainCategory = MainCategory | 'All'
export type FilterSubCategory = SubCategory | 'All'

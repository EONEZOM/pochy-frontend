import {
  COSMETIC_CATEGORIES,
  type MainCategory,
  type SubCategory,
} from '@/constants/category';

const normalizeText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '');

const isMainCategoryValue = (value: string): value is MainCategory =>
  COSMETIC_CATEGORIES.some((main) => main.value === value);

const isSubCategoryValue = (
  mainValue: MainCategory,
  subValue: string,
): subValue is SubCategory => {
  const main = COSMETIC_CATEGORIES.find((c) => c.value === mainValue);
  if (!main) {
    return false;
  }
  return main.subCategories.some((sub) => sub.value === subValue);
};

/** 한글 라벨·자유 텍스트 product_type → API/필터용 대·소분류 value */
export const mapProductTypeToCategories = (
  productType: string,
): { main_category: MainCategory; sub_category: SubCategory } => {
  const normalized = normalizeText(productType);
  if (!normalized) {
    return { main_category: 'Etc', sub_category: 'Other' };
  }

  for (const main of COSMETIC_CATEGORIES) {
    const mainNorm = normalizeText(main.label);
    if (
      normalized.includes(mainNorm) ||
      mainNorm.includes(normalized) ||
      normalized === normalizeText(main.value)
    ) {
      return {
        main_category: main.value,
        sub_category: main.subCategories[0]?.value ?? 'Other',
      };
    }

    for (const sub of main.subCategories) {
      const subNorm = normalizeText(sub.label);
      if (
        normalized.includes(subNorm) ||
        subNorm.includes(normalized) ||
        normalized === normalizeText(sub.value)
      ) {
        return { main_category: main.value, sub_category: sub.value };
      }
    }
  }

  return { main_category: 'Etc', sub_category: 'Other' };
};

/** API에 저장된 category/subCategory를 필터·비교용 enum value로 통일 */
export const resolveStoredCosmeticCategories = (
  rawCategory?: string | null,
  rawSubCategory?: string | null,
): { main: MainCategory; sub: SubCategory } => {
  const categoryTrimmed = String(rawCategory ?? '').trim();
  const subTrimmed = String(rawSubCategory ?? '').trim();

  let main: MainCategory;
  if (isMainCategoryValue(categoryTrimmed)) {
    main = categoryTrimmed;
  } else {
    main = mapProductTypeToCategories(categoryTrimmed).main_category;
  }

  if (subTrimmed && isSubCategoryValue(main, subTrimmed)) {
    return { main, sub: subTrimmed };
  }

  if (!categoryTrimmed || isMainCategoryValue(categoryTrimmed)) {
    if (subTrimmed) {
      const mapped = mapProductTypeToCategories(subTrimmed);
      if (mapped.main_category === main) {
        return { main, sub: mapped.sub_category };
      }
    }
    const mainDef = COSMETIC_CATEGORIES.find((c) => c.value === main);
    return {
      main,
      sub: mainDef?.subCategories[0]?.value ?? 'Other',
    };
  }

  const mapped = mapProductTypeToCategories(categoryTrimmed);
  return { main: mapped.main_category, sub: mapped.sub_category };
};

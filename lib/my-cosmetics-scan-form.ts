import { COSMETIC_CATEGORIES } from '@/constants/category';
import type { NukkiResult } from '@/components/my-cosmetics/NukkiResultCard';

const NUKKI_BLOB_KEY = '_nukkiBlob';
const NUKKI_CROP_KEY = '_cropBase64';
const NUKKI_ID_KEY = '_nukkiId';
const NUKKI_CONFIDENCE_KEY = '_confidence_score';

const normalizeText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '');

const mapProductTypeToCategories = (
  productType: string,
): { main_category: string; sub_category: string } => {
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

export const resolveProductTypeLabel = (
  mainCategory: string,
  subCategory: string,
  fallback: string,
): string => {
  const main = COSMETIC_CATEGORIES.find((c) => c.value === mainCategory);
  if (!main) {
    return fallback;
  }

  const sub = main.subCategories.find((s) => s.value === subCategory);
  if (sub && subCategory !== 'Other') {
    return sub.label;
  }

  if (mainCategory === 'Etc') {
    return fallback || main.label;
  }

  return main.label;
};

export const nukkiResultToScanFormData = (
  item: NukkiResult,
): Record<string, unknown> => {
  const { main_category, sub_category } = mapProductTypeToCategories(
    item.product_type,
  );
  return {
    brand_name: item.brand,
    product_name: item.product_name,
    main_category,
    sub_category,
    features: item.key_features.join(', '),
    image_url: item.cropBase64,
    official_image: item.src,
    [NUKKI_BLOB_KEY]: item.nukkiBlob,
    [NUKKI_CROP_KEY]: item.cropBase64,
    [NUKKI_ID_KEY]: item.id,
    [NUKKI_CONFIDENCE_KEY]: item.confidence_score,
  };
};

export const scanFormDataToNukkiResult = (
  data: Record<string, unknown>,
  fallback?: NukkiResult,
): NukkiResult => {
  const mainCategory = String(data.main_category ?? fallback?.product_type ?? '');
  const subCategory = String(data.sub_category ?? '');
  const featuresRaw = String(data.features ?? '');
  const keyFeatures = featuresRaw
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  const productType = resolveProductTypeLabel(
    mainCategory,
    subCategory,
    fallback?.product_type ?? '',
  );

  const src =
    String(data.official_image ?? '').trim() ||
    fallback?.src ||
    '';

  const nukkiBlob =
    data[NUKKI_BLOB_KEY] instanceof Blob
      ? (data[NUKKI_BLOB_KEY] as Blob)
      : fallback?.nukkiBlob;

  const imageUrlRaw = String(data.image_url ?? '').trim();
  const cropBase64 =
    typeof data[NUKKI_CROP_KEY] === 'string'
      ? String(data[NUKKI_CROP_KEY])
      : imageUrlRaw.startsWith('data:')
        ? imageUrlRaw
        : fallback?.cropBase64 ?? '';

  const idRaw = data[NUKKI_ID_KEY];
  const id =
    typeof idRaw === 'number' && Number.isFinite(idRaw)
      ? idRaw
      : (fallback?.id ?? 0);

  const confidenceRaw = data[NUKKI_CONFIDENCE_KEY];
  const confidence_score =
    typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
      ? confidenceRaw
      : (fallback?.confidence_score ?? 0);

  return {
    id,
    src,
    nukkiBlob,
    cropBase64,
    brand: String(data.brand_name ?? fallback?.brand ?? ''),
    product_name: String(data.product_name ?? fallback?.product_name ?? ''),
    product_type: productType,
    key_features: keyFeatures.length > 0 ? keyFeatures : (fallback?.key_features ?? []),
    confidence_score,
  };
};

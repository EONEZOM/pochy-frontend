import { COSMETIC_CATEGORIES } from '@/constants/category';
import type { NukkiResult } from '@/components/my-cosmetics/NukkiResultCard';
import {
  mapProductTypeToCategories,
  resolveStoredCosmeticCategories,
} from '@/lib/cosmetic-category-normalize';

const NUKKI_BLOB_KEY = '_nukkiBlob';
const NUKKI_CROP_KEY = '_cropBase64';
const NUKKI_ID_KEY = '_nukkiId';
const NUKKI_CONFIDENCE_KEY = '_confidence_score';
const NUKKI_DID_REMOVE_KEY = '_didRemoveBackground';

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
  const main_category =
    item.main_category?.trim() ||
    mapProductTypeToCategories(item.product_type).main_category;
  const sub_category =
    item.sub_category?.trim() ||
    mapProductTypeToCategories(item.product_type).sub_category;
  return {
    brand_name: item.brand,
    product_name: item.product_name,
    main_category,
    sub_category,
    features: item.key_features.join(', '),
    image_url: item.cropBase64,
    official_image: item.src,
    nukkiBlob: item.nukkiBlob,
    [NUKKI_BLOB_KEY]: item.nukkiBlob,
    [NUKKI_CROP_KEY]: item.cropBase64,
    [NUKKI_ID_KEY]: item.id,
    [NUKKI_CONFIDENCE_KEY]: item.confidence_score,
    [NUKKI_DID_REMOVE_KEY]: item.didRemoveBackground === true,
  };
};

export const scanFormDataToNukkiResult = (
  data: Record<string, unknown>,
  fallback?: NukkiResult,
): NukkiResult => {
  const mainCategory = String(
    data.main_category ?? fallback?.main_category ?? fallback?.product_type ?? '',
  );
  const subCategory = String(
    data.sub_category ?? fallback?.sub_category ?? '',
  );
  const featuresRaw = String(data.features ?? '');
  const keyFeatures = featuresRaw
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  const { main: resolvedMain, sub: resolvedSub } =
    resolveStoredCosmeticCategories(mainCategory, subCategory);

  const productType = resolveProductTypeLabel(
    resolvedMain,
    resolvedSub,
    fallback?.product_type ?? '',
  );

  const src =
    String(data.official_image ?? '').trim() ||
    fallback?.src ||
    '';

  const nukkiBlob =
    data[NUKKI_BLOB_KEY] instanceof Blob
      ? (data[NUKKI_BLOB_KEY] as Blob)
      : data.nukkiBlob instanceof Blob
        ? data.nukkiBlob
        : fallback?.nukkiBlob;

  const didRemoveRaw = data[NUKKI_DID_REMOVE_KEY] ?? data.didRemoveBackground;
  const didRemoveBackground =
    didRemoveRaw === true
      ? true
      : didRemoveRaw === false
        ? false
        : fallback?.didRemoveBackground;

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
    didRemoveBackground,
    cropBase64,
    brand: String(data.brand_name ?? fallback?.brand ?? ''),
    product_name: String(data.product_name ?? fallback?.product_name ?? ''),
    product_type: productType,
    main_category: resolvedMain,
    sub_category: resolvedSub,
    key_features: keyFeatures.length > 0 ? keyFeatures : (fallback?.key_features ?? []),
    confidence_score,
  };
};

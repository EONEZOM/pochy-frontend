import type { NukkiResult } from '@/components/my-cosmetics/NukkiResultCard';
import { removeProductBackground } from '@/lib/nukki';
import { resolveProductTypeLabel } from '@/lib/my-cosmetics-scan-form';
import {
  cropDataUrlByNormalizedBBox,
  isValidProductBbox,
  resizeDataUrlForNukki,
  resizeDataUrlForVision,
  type NormalizedBBox,
} from '@/utils/image-utils';
import {
  cropBox,
  cropFullImage,
  detectCosmeticBoxesFromImage,
  type YoloBox,
  yoloBoxIou,
} from '@/utils/yolo-detect';

const VISION_MAX_SIDE_PX = 1280;
const VISION_JPEG_QUALITY = 0.88;
const NUKKI_MAX_SIDE_PX = 768;
const NAVER_SEARCH_DELAY_MS = 150;
const NUKKI_STEP_DELAY_MS = 200;
const MIN_COSMETIC_CONFIDENCE = 0.4;
const MIN_PRODUCT_BBOX_CONFIDENCE = 0.5;
const OFFICIAL_IMAGE_PREFERRED_BBOX_CONFIDENCE = 0.72;
const SECONDARY_BOX_MIN_SCORE = 0.35;
const SECONDARY_BOX_MAX_IOU = 0.3;
const PRODUCT_BBOX_MARGIN_RATIO = 0.05;

export const MY_COSMETICS_CROP_VISION_HINT = `각 이미지는 화장품 제품 하나만 담긴 크롭 사진입니다.
이미지 개수와 results 배열 길이를 반드시 일치시키고, 각 result의 image_index는 해당 이미지 순서(0부터)와 정확히 일치해야 합니다.
한 이미지에서 여러 result를 만들지 마세요.
용기 라벨·로고 텍스트를 최우선으로 읽어 brand_name과 product_name을 작성하세요.`;

type VisionExtractRow = {
  image_index?: number;
  brand_name?: string;
  product_name?: string;
  main_category?: string;
  sub_category?: string;
  features?: string[];
  is_cosmetic?: boolean;
  confidence_score?: number;
};

type ProductBboxRow = {
  image_index?: number;
  bbox?: NormalizedBBox;
  confidence?: number;
  has_hand?: boolean;
};

export type CosmeticCropCandidate = {
  dataUrl: string;
  sourceIndex: number;
  yoloScore: number;
  productBboxConfidence: number;
  hasHand: boolean;
};

export type CosmeticVisionCropResult = {
  image_index: number;
  brand_name: string;
  product_name: string;
  main_category: string;
  sub_category: string;
  features: string[];
  is_cosmetic: boolean;
  confidence_score: number;
  official_image: string | null;
  cropBase64: string;
  productBboxConfidence: number;
  hasHand: boolean;
};

const isLikelyCosmetic = (item: VisionExtractRow): boolean => {
  if (item.is_cosmetic === true) {
    return true;
  }
  const score = item.confidence_score;
  return typeof score === 'number' && score >= MIN_COSMETIC_CONFIDENCE;
};

const normalizeVisionRow = (
  item: VisionExtractRow,
  imageIndex: number,
  crop: CosmeticCropCandidate,
): CosmeticVisionCropResult => ({
  image_index: imageIndex,
  brand_name: String(item.brand_name ?? '').trim(),
  product_name: String(item.product_name ?? '').trim(),
  main_category: String(item.main_category ?? 'Etc').trim() || 'Etc',
  sub_category: String(item.sub_category ?? 'Other').trim() || 'Other',
  features: Array.isArray(item.features)
    ? item.features.map((f) => String(f).trim()).filter(Boolean)
    : [],
  is_cosmetic: item.is_cosmetic === true,
  confidence_score:
    typeof item.confidence_score === 'number' && Number.isFinite(item.confidence_score)
      ? item.confidence_score
      : 0,
  official_image: null,
  cropBase64: crop.dataUrl,
  productBboxConfidence: crop.productBboxConfidence,
  hasHand: crop.hasHand,
});

const pickBoxesForSourceImage = (boxes: YoloBox[]): YoloBox[] => {
  if (boxes.length === 0) {
    return [];
  }

  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const picked: YoloBox[] = [sorted[0]];

  if (sorted.length > 1) {
    const second = sorted[1];
    if (
      second.score >= SECONDARY_BOX_MIN_SCORE &&
      yoloBoxIou(sorted[0], second) < SECONDARY_BOX_MAX_IOU
    ) {
      picked.push(second);
    }
  }

  return picked;
};

const pickBestProductBboxPerCrop = (
  rawResults: ProductBboxRow[],
  cropCount: number,
): Map<number, ProductBboxRow> => {
  const byIndex = new Map<number, ProductBboxRow>();

  for (const item of rawResults) {
    const idx = Number(item.image_index);
    const resolvedIndex =
      Number.isFinite(idx) && idx >= 0 && idx < cropCount
        ? idx
        : byIndex.size < cropCount
          ? byIndex.size
          : -1;

    if (resolvedIndex < 0) {
      continue;
    }

    const prev = byIndex.get(resolvedIndex);
    const prevScore = prev?.confidence ?? 0;
    const nextScore = item.confidence ?? 0;
    if (!prev || nextScore >= prevScore) {
      byIndex.set(resolvedIndex, item);
    }
  }

  if (byIndex.size === 0 && rawResults.length === cropCount) {
    rawResults.forEach((item, index) => {
      byIndex.set(index, item);
    });
  }

  return byIndex;
};

const pickBestResultPerCrop = (
  rawResults: VisionExtractRow[],
  crops: CosmeticCropCandidate[],
): CosmeticVisionCropResult[] => {
  const cropCount = crops.length;
  const byIndex = new Map<number, VisionExtractRow>();

  for (const item of rawResults) {
    const idx = Number(item.image_index);
    const resolvedIndex =
      Number.isFinite(idx) && idx >= 0 && idx < cropCount
        ? idx
        : byIndex.size < cropCount
          ? byIndex.size
          : -1;

    if (resolvedIndex < 0) {
      continue;
    }

    const prev = byIndex.get(resolvedIndex);
    const prevScore = prev?.confidence_score ?? 0;
    const nextScore = item.confidence_score ?? 0;
    if (!prev || nextScore >= prevScore) {
      byIndex.set(resolvedIndex, item);
    }
  }

  if (byIndex.size === 0 && rawResults.length === cropCount) {
    rawResults.forEach((item, index) => {
      byIndex.set(index, item);
    });
  }

  const accepted: CosmeticVisionCropResult[] = [];
  for (let i = 0; i < cropCount; i++) {
    const item = byIndex.get(i);
    if (!item || !isLikelyCosmetic(item)) {
      continue;
    }
    accepted.push(normalizeVisionRow(item, i, crops[i]));
  }

  return accepted;
};

export const collectCosmeticCropsFromImages = async (
  loadImage: (src: string) => Promise<HTMLImageElement>,
  imageSources: string[],
): Promise<CosmeticCropCandidate[]> => {
  const candidates: CosmeticCropCandidate[] = [];

  for (let sourceIndex = 0; sourceIndex < imageSources.length; sourceIndex++) {
    const src = imageSources[sourceIndex];
    const imgElement = await loadImage(src);
    const boxes = await detectCosmeticBoxesFromImage(imgElement);
    const pickedBoxes = pickBoxesForSourceImage(boxes);

    if (pickedBoxes.length > 0) {
      for (const box of pickedBoxes) {
        candidates.push({
          dataUrl: cropBox(imgElement, box),
          sourceIndex,
          yoloScore: box.score,
          productBboxConfidence: 0,
          hasHand: false,
        });
      }
    } else {
      candidates.push({
        dataUrl: cropFullImage(imgElement),
        sourceIndex,
        yoloScore: 0,
        productBboxConfidence: 0,
        hasHand: false,
      });
    }
  }

  return candidates;
};

export const refineCropsToProductOnly = async (
  crops: CosmeticCropCandidate[],
): Promise<CosmeticCropCandidate[]> => {
  if (crops.length === 0) {
    return [];
  }

  const resizedForBbox = await Promise.all(
    crops.map((crop) =>
      resizeDataUrlForVision(crop.dataUrl, VISION_MAX_SIDE_PX, VISION_JPEG_QUALITY),
    ),
  );

  let bboxRows: ProductBboxRow[] = [];

  try {
    const res = await fetch('/api/vision/product-bbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: resizedForBbox }),
    });
    const data = await res.json();
    if (res.ok) {
      bboxRows = (data.results ?? []) as ProductBboxRow[];
    }
  } catch {
    return crops;
  }

  const bboxByIndex = pickBestProductBboxPerCrop(bboxRows, crops.length);
  const refined: CosmeticCropCandidate[] = [];

  for (let i = 0; i < crops.length; i++) {
    const crop = crops[i];
    const bboxResult = bboxByIndex.get(i);
    const confidence =
      typeof bboxResult?.confidence === 'number' && Number.isFinite(bboxResult.confidence)
        ? bboxResult.confidence
        : 0;
    const bbox = bboxResult?.bbox;

    if (
      confidence >= MIN_PRODUCT_BBOX_CONFIDENCE &&
      bbox &&
      isValidProductBbox(bbox)
    ) {
      try {
        const tightCrop = await cropDataUrlByNormalizedBBox(
          crop.dataUrl,
          bbox,
          PRODUCT_BBOX_MARGIN_RATIO,
        );
        refined.push({
          ...crop,
          dataUrl: tightCrop,
          productBboxConfidence: confidence,
          hasHand: bboxResult?.has_hand === true,
        });
        continue;
      } catch {
        // YOLO 크롭 유지
      }
    }

    refined.push({
      ...crop,
      productBboxConfidence: confidence,
      hasHand: bboxResult?.has_hand === true || crop.hasHand,
    });
  }

  return refined;
};

export const analyzeCosmeticCropsWithVision = async (
  crops: CosmeticCropCandidate[],
): Promise<CosmeticVisionCropResult[]> => {
  if (crops.length === 0) {
    return [];
  }

  const resizedCrops = await Promise.all(
    crops.map((crop) =>
      resizeDataUrlForVision(crop.dataUrl, VISION_MAX_SIDE_PX, VISION_JPEG_QUALITY),
    ),
  );

  const res = await fetch('/api/vision/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images: resizedCrops,
      hint: MY_COSMETICS_CROP_VISION_HINT,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(String(data.error ?? 'GPT 분석 실패'));
  }

  const rawResults = (data.results ?? []) as VisionExtractRow[];
  return pickBestResultPerCrop(rawResults, crops);
};

export const enrichCosmeticVisionResultsWithNaver = async (
  items: CosmeticVisionCropResult[],
): Promise<CosmeticVisionCropResult[]> => {
  const enriched: CosmeticVisionCropResult[] = [];

  for (const item of items) {
    let official_image: string | null = null;
    const searchQuery = `${item.brand_name} ${item.product_name}`.trim();

    if (searchQuery.length > 0) {
      try {
        const searchRes = await fetch(
          `/api/naver/search?query=${encodeURIComponent(searchQuery)}`,
        );
        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as {
            official_image?: string | null;
          };
          const image = searchData.official_image;
          if (typeof image === 'string' && image.trim().length > 0) {
            official_image = image.trim();
          }
        }
      } catch {
        official_image = null;
      }
      await new Promise((resolve) => {
        window.setTimeout(resolve, NAVER_SEARCH_DELAY_MS);
      });
    }

    enriched.push({ ...item, official_image });
  }

  return enriched;
};

const toMediaProxyUrl = (imageUrl: string): string =>
  `/api/media-proxy?url=${encodeURIComponent(imageUrl.trim())}`;

const fetchOfficialImageBlob = async (
  imageUrl: string,
): Promise<Blob | null> => {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const res = await fetch(toMediaProxyUrl(trimmed));
    if (!res.ok) {
      return null;
    }
    return await res.blob();
  } catch {
    return null;
  }
};

const shouldPreferOfficialImage = (item: CosmeticVisionCropResult): boolean => {
  const official = item.official_image?.trim();
  if (!official) {
    return false;
  }

  return (
    item.hasHand ||
    item.productBboxConfidence < OFFICIAL_IMAGE_PREFERRED_BBOX_CONFIDENCE
  );
};

const delayMs = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const applyNukkiToCosmeticVisionResults = async (
  items: CosmeticVisionCropResult[],
): Promise<NukkiResult[]> => {
  const nukkiResults: NukkiResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const productType = resolveProductTypeLabel(
      item.main_category,
      item.sub_category,
      '',
    );

    let nukkiSrc = item.cropBase64;
    let nukkiBlob: Blob | undefined;

    const officialUrl = item.official_image?.trim();
    if (officialUrl && shouldPreferOfficialImage(item)) {
      const officialBlob = await fetchOfficialImageBlob(officialUrl);
      nukkiSrc = toMediaProxyUrl(officialUrl);
      if (officialBlob) {
        nukkiBlob = officialBlob;
      }
    } else {
      try {
        const nukkiInput = await resizeDataUrlForNukki(
          item.cropBase64,
          NUKKI_MAX_SIDE_PX,
        );
        const { blob, previewUrl } = await removeProductBackground(nukkiInput, {
          model: 'isnet_quint8',
        });
        nukkiBlob = blob;
        nukkiSrc = previewUrl;
      } catch {
        // 누끼 실패 시 원본 크롭 사용
      }
    }

    nukkiResults.push({
      id: item.image_index >= 0 ? item.image_index : i,
      src: nukkiSrc,
      nukkiBlob,
      cropBase64: item.cropBase64,
      brand: item.brand_name,
      product_name: item.product_name,
      product_type: productType,
      key_features: item.features,
      confidence_score: item.confidence_score,
    });

    await delayMs(NUKKI_STEP_DELAY_MS);
  }

  return nukkiResults;
};

export const runMyCosmeticsScanPipeline = async (
  imageSources: string[],
  loadImage: (src: string) => Promise<HTMLImageElement>,
): Promise<NukkiResult[]> => {
  const roughCrops = await collectCosmeticCropsFromImages(loadImage, imageSources);
  const refinedCrops = await refineCropsToProductOnly(roughCrops);
  const visionResults = await analyzeCosmeticCropsWithVision(refinedCrops);

  if (visionResults.length === 0) {
    return [];
  }

  const enriched = await enrichCosmeticVisionResultsWithNaver(visionResults);
  return applyNukkiToCosmeticVisionResults(enriched);
};

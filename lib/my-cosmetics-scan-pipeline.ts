import type { NukkiResult } from '@/types/nukki-result';
import { removeProductBackground } from '@/lib/nukki';
import { applyNukkiFromRemoteUrl } from '@/lib/nukki-product-image';
import { resolveProductTypeLabel } from '@/lib/my-cosmetics-scan-form';
import {
  cropDataUrlByNormalizedBBox,
  extendBboxBottom,
  isBboxHeightSuspiciouslySmall,
  isBboxLikelyMissingBottomCap,
  isValidProductBbox,
  resizeDataUrlForNukki,
  resizeDataUrlForVision,
  unionNormalizedBboxes,
  type NormalizedBBox,
} from '@/utils/image-utils';
import {
  cropBox,
  cropFullImage,
  detectCosmeticBoxesFromImage,
  pickPrimaryProductBox,
  yoloBoxToNormalizedBBox,
} from '@/utils/yolo-detect';

const VISION_MAX_SIDE_PX = 1280;
const VISION_JPEG_QUALITY = 0.88;
const NUKKI_MAX_SIDE_PX = 1024;
const NAVER_SEARCH_DELAY_MS = 150;
const NUKKI_STEP_DELAY_MS = 200;
const MIN_COSMETIC_CONFIDENCE = 0.4;
const MIN_PRODUCT_BBOX_CONFIDENCE = 0.5;
const OFFICIAL_IMAGE_PREFERRED_BBOX_CONFIDENCE = 0.72;
const PRODUCT_BBOX_MARGIN_RATIO = 0.10;
const MIN_REFINE_BBOX_HEIGHT_RATIO = 0.7;
const BBOX_CONFIDENCE_TIE_THRESHOLD = 0.08;

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

export type CropSource = 'fullImageBbox' | 'yolo' | 'fullImage';

export type CosmeticCropCandidate = {
  dataUrl: string;
  sourceIndex: number;
  yoloScore: number;
  productBboxConfidence: number;
  hasHand: boolean;
  cropSource: CropSource;
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

const pickBestProductBboxPerImage = (
  rawResults: ProductBboxRow[],
  imageCount: number,
): Map<number, ProductBboxRow> => {
  const byIndex = new Map<number, ProductBboxRow>();

  for (const item of rawResults) {
    const idx = Number(item.image_index);
    const resolvedIndex =
      Number.isFinite(idx) && idx >= 0 && idx < imageCount
        ? idx
        : byIndex.size < imageCount
          ? byIndex.size
          : -1;

    if (resolvedIndex < 0) {
      continue;
    }

    const prev = byIndex.get(resolvedIndex);
    const prevScore = prev?.confidence ?? 0;
    const nextScore = item.confidence ?? 0;

    if (!prev) {
      byIndex.set(resolvedIndex, item);
      continue;
    }

    if (nextScore > prevScore + BBOX_CONFIDENCE_TIE_THRESHOLD) {
      byIndex.set(resolvedIndex, item);
      continue;
    }

    if (Math.abs(nextScore - prevScore) <= BBOX_CONFIDENCE_TIE_THRESHOLD) {
      const prevYMax = prev.bbox?.y_max ?? 0;
      const nextYMax = item.bbox?.y_max ?? 0;
      if (nextYMax > prevYMax) {
        byIndex.set(resolvedIndex, item);
      }
      continue;
    }

    if (nextScore >= prevScore) {
      byIndex.set(resolvedIndex, item);
    }
  }

  if (byIndex.size === 0 && rawResults.length === imageCount) {
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

const fetchProductBboxes = async (
  images: string[],
): Promise<ProductBboxRow[]> => {
  if (images.length === 0) {
    return [];
  }

  try {
    const res = await fetch('/api/vision/product-bbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
    });
    const data = await res.json();
    if (!res.ok) {
      return [];
    }
    return (data.results ?? []) as ProductBboxRow[];
  } catch {
    return [];
  }
};

const resolveProductBboxWithYoloMerge = async (
  gptBbox: NormalizedBBox,
  imgElement: HTMLImageElement,
): Promise<NormalizedBBox> => {
  if (!isBboxLikelyMissingBottomCap(gptBbox)) {
    return gptBbox;
  }

  const imgW = imgElement.naturalWidth;
  const imgH = imgElement.naturalHeight;
  const yoloBoxes = await detectCosmeticBoxesFromImage(imgElement);
  const primaryBox = pickPrimaryProductBox(yoloBoxes, imgElement);

  if (primaryBox && imgW > 0 && imgH > 0) {
    const yoloNorm = yoloBoxToNormalizedBBox(primaryBox, imgW, imgH);
    const merged = unionNormalizedBboxes(gptBbox, yoloNorm);
    if (isValidProductBbox(merged)) {
      return merged;
    }
  }

  return extendBboxBottom(gptBbox, 0.12);
};

const tryCropFromBboxOnFullImage = async (
  fullDataUrl: string,
  imgElement: HTMLImageElement,
  bboxResult: ProductBboxRow | undefined,
): Promise<{
  dataUrl: string;
  confidence: number;
  hasHand: boolean;
} | null> => {
  const confidence =
    typeof bboxResult?.confidence === 'number' && Number.isFinite(bboxResult.confidence)
      ? bboxResult.confidence
      : 0;
  const bbox = bboxResult?.bbox;

  if (
    confidence < MIN_PRODUCT_BBOX_CONFIDENCE ||
    !bbox ||
    !isValidProductBbox(bbox)
  ) {
    return null;
  }

  try {
    const finalBbox = await resolveProductBboxWithYoloMerge(bbox, imgElement);
    const cropped = await cropDataUrlByNormalizedBBox(
      fullDataUrl,
      finalBbox,
      PRODUCT_BBOX_MARGIN_RATIO,
    );
    return {
      dataUrl: cropped,
      confidence,
      hasHand: bboxResult?.has_hand === true,
    };
  } catch {
    return null;
  }
};

export const collectCosmeticCropsFromImages = async (
  loadImage: (src: string) => Promise<HTMLImageElement>,
  imageSources: string[],
): Promise<CosmeticCropCandidate[]> => {
  if (imageSources.length === 0) {
    return [];
  }

  const loaded = await Promise.all(
    imageSources.map(async (src, sourceIndex) => {
      const imgElement = await loadImage(src);
      const fullDataUrl = cropFullImage(imgElement);
      return { sourceIndex, imgElement, fullDataUrl };
    }),
  );

  const resizedForBbox = await Promise.all(
    loaded.map((entry) =>
      resizeDataUrlForVision(
        entry.fullDataUrl,
        VISION_MAX_SIDE_PX,
        VISION_JPEG_QUALITY,
      ),
    ),
  );

  const bboxRows = await fetchProductBboxes(resizedForBbox);
  const bboxBySourceIndex = pickBestProductBboxPerImage(
    bboxRows,
    loaded.length,
  );

  const candidates: CosmeticCropCandidate[] = [];

  for (let i = 0; i < loaded.length; i++) {
    const { sourceIndex, imgElement, fullDataUrl } = loaded[i];
    const bboxFromFull = await tryCropFromBboxOnFullImage(
      fullDataUrl,
      imgElement,
      bboxBySourceIndex.get(i),
    );

    if (bboxFromFull) {
      candidates.push({
        dataUrl: bboxFromFull.dataUrl,
        sourceIndex,
        yoloScore: 0,
        productBboxConfidence: bboxFromFull.confidence,
        hasHand: bboxFromFull.hasHand,
        cropSource: 'fullImageBbox',
      });
      continue;
    }

    const yoloBoxes = await detectCosmeticBoxesFromImage(imgElement);
    const primaryBox = pickPrimaryProductBox(yoloBoxes, imgElement);

    if (primaryBox) {
      candidates.push({
        dataUrl: cropBox(imgElement, primaryBox),
        sourceIndex,
        yoloScore: primaryBox.score,
        productBboxConfidence: 0,
        hasHand: false,
        cropSource: 'yolo',
      });
      continue;
    }

    candidates.push({
      dataUrl: fullDataUrl,
      sourceIndex,
      yoloScore: 0,
      productBboxConfidence: 0,
      hasHand: false,
      cropSource: 'fullImage',
    });
  }

  return candidates;
};

export const refineCropsToProductOnly = async (
  crops: CosmeticCropCandidate[],
): Promise<CosmeticCropCandidate[]> => {
  const yoloCrops = crops.filter((crop) => crop.cropSource === 'yolo');
  if (yoloCrops.length === 0) {
    return crops;
  }

  const yoloIndices = crops
    .map((crop, index) => (crop.cropSource === 'yolo' ? index : -1))
    .filter((index) => index >= 0);

  const resizedForBbox = await Promise.all(
    yoloCrops.map((crop) =>
      resizeDataUrlForVision(crop.dataUrl, VISION_MAX_SIDE_PX, VISION_JPEG_QUALITY),
    ),
  );

  const bboxRows = await fetchProductBboxes(resizedForBbox);
  const bboxByYoloIndex = pickBestProductBboxPerImage(bboxRows, yoloCrops.length);

  const refined = [...crops];

  for (let yoloIdx = 0; yoloIdx < yoloCrops.length; yoloIdx++) {
    const cropIndex = yoloIndices[yoloIdx];
    const crop = crops[cropIndex];
    const bboxResult = bboxByYoloIndex.get(yoloIdx);
    const confidence =
      typeof bboxResult?.confidence === 'number' && Number.isFinite(bboxResult.confidence)
        ? bboxResult.confidence
        : 0;
    const bbox = bboxResult?.bbox;

    if (
      confidence >= MIN_PRODUCT_BBOX_CONFIDENCE &&
      bbox &&
      isValidProductBbox(bbox) &&
      !isBboxHeightSuspiciouslySmall(bbox, MIN_REFINE_BBOX_HEIGHT_RATIO)
    ) {
      try {
        const tightCrop = await cropDataUrlByNormalizedBBox(
          crop.dataUrl,
          bbox,
          PRODUCT_BBOX_MARGIN_RATIO,
        );
        refined[cropIndex] = {
          ...crop,
          dataUrl: tightCrop,
          productBboxConfidence: confidence,
          hasHand: bboxResult?.has_hand === true,
        };
        continue;
      } catch {
        // YOLO 크롭 유지
      }
    }

    refined[cropIndex] = {
      ...crop,
      productBboxConfidence: confidence,
      hasHand: bboxResult?.has_hand === true || crop.hasHand,
    };
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

    let displaySrc = item.cropBase64;
    let nukkiBlob: Blob | undefined;
    let didRemoveBackground = false;

    const officialUrl = item.official_image?.trim();
    const preferOfficialDisplay =
      Boolean(officialUrl) && shouldPreferOfficialImage(item);

    const nukkiInput = await resizeDataUrlForNukki(
      item.cropBase64,
      NUKKI_MAX_SIDE_PX,
    );
    const { blob, previewUrl, didRemoveBackground: removed } =
      await removeProductBackground(nukkiInput);

    if (removed) {
      didRemoveBackground = true;
      nukkiBlob = blob;
      displaySrc = previewUrl;
    } else if (officialUrl) {
      const {
        blob: officialBlob,
        previewUrl: officialPreviewUrl,
        didRemoveBackground: officialRemoved,
      } = await applyNukkiFromRemoteUrl(officialUrl);

      if (officialRemoved) {
        didRemoveBackground = true;
        nukkiBlob = officialBlob;
        displaySrc = officialPreviewUrl;
      } else if (preferOfficialDisplay) {
        displaySrc = toMediaProxyUrl(officialUrl);
      }
    }

    nukkiResults.push({
      id: item.image_index >= 0 ? item.image_index : i,
      src: displaySrc,
      nukkiBlob,
      didRemoveBackground,
      cropBase64: item.cropBase64,
      brand: item.brand_name,
      product_name: item.product_name,
      product_type: productType,
      main_category: item.main_category,
      sub_category: item.sub_category,
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

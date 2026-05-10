/**
 * 위시리스트 화장품 등록용 수동 멀티파트 래퍼
 *
 * Orval이 자동 생성한 훅을 사용하지 않고 직접 FormData를 구성하는 이유:
 *   Orval 생성 코드는 JSON 데이터를 plain string으로 append합니다.
 *   Spring @RequestPart는 JSON 파트에 반드시 Content-Type: application/json이
 *   있어야 역직렬화할 수 있어서, new Blob([...], {type:'application/json'}) 패턴이 필수입니다.
 *
 *   또한 File 없이 순수 Blob을 append하면 일부 환경에서
 *   Content-Type이 application/octet-stream으로 전송되어 500 에러가 발생합니다.
 *   따라서 이미지는 항상 File 객체로 변환 후 파일명과 함께 append합니다.
 *
 * 등록 API는 `POST /api/wish-cosmetics/v2`(CreateDetailDtoV2 + capture/direct 인덱스)를 사용합니다.
 */
import { customInstance } from '@/api/axios-instance';
import type { CreateDetailDtoV2, UpdateDto } from '@/api/model';
import { ProductImageType } from '@/api/model/productImageType';

export function normalizeMultipartImageFile(
  image: File,
  fallbackName: string,
): File {
  if (image.type && image.type.length > 0) {
    return image;
  }
  return new File([image], image.name || fallbackName, {
    type: 'image/jpeg',
  });
}

type CreateWishCosmeticsV2MultipartPayload = {
  request: CreateDetailDtoV2[];
  captureImages: File[];
  directImages?: File[];
};

/**
 * 위시 스캔/직접 등록 V2 — 멀티파트 필드: captureImages, directImages(선택), request(JSON)
 */
export const createWishCosmeticsV2Multipart = async ({
  request,
  captureImages,
  directImages = [],
}: CreateWishCosmeticsV2MultipartPayload) => {
  const formData = new FormData();

  captureImages.forEach((image, index) => {
    const normalizedFile = normalizeMultipartImageFile(
      image,
      `capture-${index}.jpg`,
    );
    formData.append(
      'captureImages',
      normalizedFile,
      normalizedFile.name || `capture-${index}.jpg`,
    );
  });

  directImages.forEach((image, index) => {
    const normalizedFile = normalizeMultipartImageFile(
      image,
      `direct-${index}.jpg`,
    );
    formData.append(
      'directImages',
      normalizedFile,
      normalizedFile.name || `direct-${index}.jpg`,
    );
  });

  formData.append(
    'request',
    new Blob([JSON.stringify(request)], { type: 'application/json' }),
  );

  return customInstance({
    url: '/api/wish-cosmetics/v2',
    method: 'POST',
    data: formData,
  });
};

function normalizePriceFromUnknown(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 스캔 분석 결과(JSON 행)를 V2 `request` 행과 `directImages` 파일 목록으로 변환합니다.
 */
export function mapScanResultsToV2Request(
  analysisResults: Record<string, unknown>[],
): {
  request: CreateDetailDtoV2[];
  directImageFiles: File[];
} {
  const directImageFiles: File[] = [];
  const fileToIndex = new Map<File, number>();

  for (const item of analysisResults) {
    const f = item.imageFile;
    if (f instanceof File && !fileToIndex.has(f)) {
      fileToIndex.set(f, directImageFiles.length);
      directImageFiles.push(f);
    }
  }

  const request = analysisResults.map((item) => {
    const imageFile = item.imageFile;
    let productImage;

    if (imageFile instanceof File && fileToIndex.has(imageFile)) {
      productImage = {
        type: ProductImageType.DIRECT,
        directImageIndex: fileToIndex.get(imageFile)!,
      };
    } else {
      const naverUrl = String(item.official_image ?? '').trim();
      const validNaver = /^https?:\/\//i.test(naverUrl);
      productImage = validNaver
        ? { type: ProductImageType.NAVER, naverImageUrl: naverUrl }
        : { type: ProductImageType.NAVER };
    }

    const rawIdx = item.image_index;
    let captureImageIndex = 0;
    if (typeof rawIdx === 'number' && Number.isFinite(rawIdx)) {
      captureImageIndex = rawIdx;
    } else if (rawIdx != null && String(rawIdx).trim() !== '') {
      const parsed = Number.parseInt(String(rawIdx), 10);
      captureImageIndex = Number.isFinite(parsed) ? parsed : 0;
    }

    return {
      name: String(item.product_name ?? ''),
      brand: String(item.brand_name ?? ''),
      category: String(item.main_category ?? ''),
      subCategory: String(item.sub_category ?? ''),
      feature: String(item.features ?? ''),
      memo: String(item.memo ?? ''),
      price: normalizePriceFromUnknown(item.price),
      captureImageIndex,
      productImage,
    };
  });

  return { request, directImageFiles };
}

const appendFilePart = (
  formData: FormData,
  key: string,
  file?: File | null,
): void => {
  if (!file) {
    return;
  }

  const normalizedFile = normalizeMultipartImageFile(file, `${key}.jpg`);

  formData.append(key, normalizedFile, normalizedFile.name || `${key}.jpg`);
};

type PatchWishCosmeticsMultipartPayload = {
  wishCosmeticsId: number;
  request: UpdateDto;
  productDirectImage?: File | null;
  captureImage?: File | null;
};

/**
 * 위시 항목 수정(PATCH): 백엔드가 multipart + JSON `request` 파트를 요구할 때 사용합니다.
 * (등록 API와 동일한 FormData 패턴)
 */
export const patchWishCosmeticsMultipart = async ({
  wishCosmeticsId,
  request,
  productDirectImage,
  captureImage,
}: PatchWishCosmeticsMultipartPayload) => {
  const formData = new FormData();

  formData.append(
    'request',
    new Blob([JSON.stringify(request)], { type: 'application/json' }),
  );

  appendFilePart(formData, 'productDirectImage', productDirectImage);
  appendFilePart(formData, 'captureImage', captureImage);

  return customInstance({
    url: `/api/wish-cosmetics/${wishCosmeticsId}`,
    method: 'PATCH',
    data: formData,
  });
};

/**
 * 내 화장품 등록용 수동 멀티파트 래퍼
 *
 * OpenAPI `RegisterBody`: captureImages, directImages(선택), request(MyCosmeticsListRequestDtoV2)
 * Spring @RequestPart는 JSON 파트에 application/json Blob이 필요합니다.
 *
 * @see lib/wish-cosmetics.ts
 * @see api/generated/my-cosmetics-controller/my-cosmetics-controller.ts — register()
 */
import { customInstance } from '@/api/axios-instance';
import type {
  CreateDetailDtoV2,
  MyCosmeticsListRequestDtoV2,
} from '@/api/model';
import { ProductImageType } from '@/api/model/productImageType';
import { normalizeMultipartImageFile } from '@/lib/wish-cosmetics';

export type MyCosmeticsRegisterItemInput = {
  name: string;
  brand: string;
  category: string;
  feature: string;
  subCategory?: string;
  memo?: string;
  price?: number;
};

type RegisterMyCosmeticsMultipartPayload = {
  captureImages: File[];
  directImages?: File[];
  request: MyCosmeticsListRequestDtoV2;
};

export const buildMyCosmeticsRegisterPayload = (
  captureImages: File[],
  items: MyCosmeticsRegisterItemInput[],
  directImagesInput?: File[],
): RegisterMyCosmeticsMultipartPayload => {
  const normalizedCapture = captureImages.map((file, index) =>
    normalizeMultipartImageFile(file, `capture-${index}.jpg`),
  );

  const directImages = (directImagesInput ?? normalizedCapture).map(
    (file, index) =>
      normalizeMultipartImageFile(file, `direct-${index}.jpg`),
  );

  const cosmetics: CreateDetailDtoV2[] = items.map((item, index) => ({
    name: item.name,
    brand: item.brand,
    category: item.category,
    subCategory: item.subCategory ?? '',
    feature: item.feature,
    memo: item.memo ?? '',
    price: item.price ?? 0,
    captureImageIndex: index,
    productImage: {
      type: ProductImageType.DIRECT,
      directImageIndex: index,
    },
  }));

  return {
    captureImages: normalizedCapture,
    directImages,
    request: { cosmetics },
  };
};

export const registerMyCosmeticsMultipart = async (
  payload: RegisterMyCosmeticsMultipartPayload,
) => {
  const { captureImages, directImages = [], request } = payload;
  const formData = new FormData();

  captureImages.forEach((file, index) => {
    const normalizedFile = normalizeMultipartImageFile(
      file,
      `capture-${index}.jpg`,
    );
    formData.append(
      'captureImages',
      normalizedFile,
      normalizedFile.name || `capture-${index}.jpg`,
    );
  });

  directImages.forEach((file, index) => {
    const normalizedFile = normalizeMultipartImageFile(
      file,
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
    url: '/api/my-cosmetics',
    method: 'POST',
    data: formData,
    timeout: 120000,
  });
};

/** @deprecated buildMyCosmeticsRegisterPayload + registerMyCosmeticsMultipart 사용 */
export const registerMyCosmeticsFromScan = async ({
  captureImages,
  directImages,
  items,
}: {
  captureImages: File[];
  directImages?: File[];
  items: MyCosmeticsRegisterItemInput[];
}) => {
  const payload = buildMyCosmeticsRegisterPayload(
    captureImages,
    items,
    directImages,
  );
  return registerMyCosmeticsMultipart(payload);
};

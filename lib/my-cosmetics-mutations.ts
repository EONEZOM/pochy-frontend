/**
 * 내 화장품 수정·삭제 — Orval `my-cosmetics-controller`에 없는 엔드포인트 래퍼.
 * @see api/generated/my-cosmetics/my-cosmetics.ts
 */
import { customInstance } from '@/api/axios-instance';
import type { ApiResponseDTOString, ApiResponseDTOLong, UpdateDto } from '@/api/model';
import { normalizeMultipartImageFile } from '@/lib/wish-cosmetics';

/**
 * DELETE /api/my-cosmetics 본문.
 * OpenAPI `DeleteDto.wishCosmeticsIds`와 다르게 실제 API는 `ids`를 사용합니다.
 */
export type DeleteMyCosmeticsBody = {
  ids: number[];
};

export type UpdateMyCosmeticPayload = {
  request: UpdateDto;
  directImage?: File | Blob;
  captureImage?: File | Blob;
};

const blobToFile = (blob: Blob, filename: string): File => {
  if (blob instanceof File && blob.name) {
    return blob;
  }
  const mime =
    blob.type && blob.type.length > 0 ? blob.type : 'image/png';
  const ext = mime.includes('png') ? 'png' : 'jpg';
  return new File([blob], filename.replace(/\.\w+$/, `.${ext}`), { type: mime });
};

export const deleteMyCosmeticsItems = async (myCosmeticsIds: number[]) => {
  return customInstance<ApiResponseDTOString>({
    url: '/api/my-cosmetics',
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    data: { ids: myCosmeticsIds } satisfies DeleteMyCosmeticsBody,
  });
};

export const updateMyCosmeticItem = async (
  cosmeticId: number,
  payload: UpdateMyCosmeticPayload,
) => {
  const formData = new FormData();

  if (payload.directImage) {
    const normalized = normalizeMultipartImageFile(
      blobToFile(payload.directImage, 'direct.png'),
      'direct.png',
    );
    formData.append('directImage', normalized, normalized.name);
  }

  if (payload.captureImage) {
    const normalized = normalizeMultipartImageFile(
      blobToFile(payload.captureImage, 'capture.jpg'),
      'capture.jpg',
    );
    formData.append('captureImage', normalized, normalized.name);
  }

  formData.append(
    'request',
    new Blob([JSON.stringify(payload.request)], { type: 'application/json' }),
  );

  return customInstance<ApiResponseDTOLong>({
    url: `/api/my-cosmetics/${cosmeticId}`,
    method: 'PATCH',
    data: formData,
    timeout: 120000,
  });
};

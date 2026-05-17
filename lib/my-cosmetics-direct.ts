/**
 * 내 화장품 직접 등록 — POST /api/my-cosmetics/direct
 *
 * OpenAPI `RegisterDirectBody`: directImage(필수), captureImage(선택), request(JSON)
 */
import { customInstance } from '@/api/axios-instance';
import type { CreateDetailDtoV2 } from '@/api/model';
import { normalizeMultipartImageFile } from '@/lib/wish-cosmetics';

export type RegisterMyCosmeticsDirectPayload = {
  directImage: File | Blob;
  captureImage?: File | Blob;
  request: CreateDetailDtoV2;
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

export const registerMyCosmeticsDirect = async ({
  directImage,
  captureImage,
  request,
}: RegisterMyCosmeticsDirectPayload) => {
  const formData = new FormData();

  const normalizedDirect = normalizeMultipartImageFile(
    blobToFile(directImage, 'direct.png'),
    'direct.png',
  );
  formData.append('directImage', normalizedDirect, normalizedDirect.name);

  if (captureImage) {
    const normalizedCapture = normalizeMultipartImageFile(
      blobToFile(captureImage, 'capture.jpg'),
      'capture.jpg',
    );
    formData.append(
      'captureImage',
      normalizedCapture,
      normalizedCapture.name,
    );
  }

  formData.append(
    'request',
    new Blob([JSON.stringify(request)], { type: 'application/json' }),
  );

  return customInstance({
    url: '/api/my-cosmetics/direct',
    method: 'POST',
    data: formData,
    timeout: 120000,
  });
};

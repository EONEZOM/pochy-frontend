/**
 * 파우치 생성·수정용 API 래퍼
 *
 * - 생성(POST): multipart `request`(CombinedAddDto) — Spring @RequestPart 패턴
 * - 수정(PATCH): application/json `{ request: CombinedAddDto }` (OpenAPI 기준)
 * - 합성 이미지: PATCH `/api/pouches/{id}/image` multipart
 *
 * Orval `updatePouch`의 request 타입은 UpdateDto이나, 실제 수정 본문은 CombinedAddDto입니다.
 *
 * @see lib/wish-cosmetics.ts
 */
import { customInstance } from '@/api/axios-instance';
import type {
  ApiResponseDTOString,
  ApiResponseDTOUpdateDto,
  CombinedAddDto,
} from '@/api/model';
import { normalizeMultipartImageFile } from '@/lib/wish-cosmetics';

export type PouchMultipartPayload = {
  request: CombinedAddDto;
  pouchImage?: File | Blob;
};

type PouchJsonRequestBody = {
  request: CombinedAddDto;
};

const appendCombinedRequest = (formData: FormData, request: CombinedAddDto) => {
  formData.append(
    'request',
    new Blob([JSON.stringify(request)], { type: 'application/json' }),
  );
};

const toPouchImageFile = (image: File | Blob): File => {
  if (image instanceof File) {
    return normalizeMultipartImageFile(image, 'pouch.png');
  }
  const type = image.type && image.type.length > 0 ? image.type : 'image/png';
  return normalizeMultipartImageFile(
    new File([image], 'pouch.png', { type }),
    'pouch.png',
  );
};

/** POST /api/pouches — 신규 파우치 생성 */
export const createPouchMultipart = async ({
  request,
  pouchImage,
}: PouchMultipartPayload): Promise<ApiResponseDTOString> => {
  const formData = new FormData();
  appendCombinedRequest(formData, request);

  if (pouchImage) {
    const file = toPouchImageFile(pouchImage);
    formData.append('pouchImage', file, file.name);
  }

  return customInstance({
    url: '/api/pouches',
    method: 'POST',
    data: formData,
  });
};

/**
 * PATCH /api/pouches/{pouchId} — 이름·화장품·와펜 (JSON)
 * 합성 이미지는 `uploadPouchCompositeImageMultipart`로 별도 전송합니다.
 */
export const updatePouchMultipart = async (
  pouchId: number,
  { request, pouchImage }: PouchMultipartPayload,
): Promise<ApiResponseDTOUpdateDto> => {
  const body: PouchJsonRequestBody = { request };

  const response = await customInstance<ApiResponseDTOUpdateDto>({
    url: `/api/pouches/${pouchId}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    data: body,
  });

  if (pouchImage) {
    await uploadPouchCompositeImageMultipart(pouchId, pouchImage);
  }

  return response;
};

/** PATCH /api/pouches/{pouchId}/image — 합성 이미지 업로드 */
export const uploadPouchCompositeImageMultipart = async (
  pouchId: number,
  pouchImage: File | Blob,
): Promise<ApiResponseDTOString> => {
  const formData = new FormData();
  const file = toPouchImageFile(pouchImage);
  formData.append('pouchImage', file, file.name);

  return customInstance({
    url: `/api/pouches/${pouchId}/image`,
    method: 'PATCH',
    data: formData,
  });
};

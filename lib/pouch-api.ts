/**
 * 파우치 생성·수정용 수동 멀티파트 래퍼
 *
 * Orval 생성 `createPouch` / `updatePouch`는 JSON으로 Blob을 보내
 * Spring @RequestPart(JSON) + 이미지 파트 패턴과 맞지 않을 수 있습니다.
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
 * PATCH /api/pouches/{pouchId}
 * Swagger request 타입은 UpdateDto이나, 실제로는 CombinedAddDto(이름·화장품·와펜)를 받습니다.
 */
export const updatePouchMultipart = async (
  pouchId: number,
  { request, pouchImage }: PouchMultipartPayload,
): Promise<ApiResponseDTOUpdateDto> => {
  const formData = new FormData();
  appendCombinedRequest(formData, request);

  if (pouchImage) {
    const file = toPouchImageFile(pouchImage);
    formData.append('pouchImage', file, file.name);
  }

  return customInstance({
    url: `/api/pouches/${pouchId}`,
    method: 'PATCH',
    data: formData,
  });
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

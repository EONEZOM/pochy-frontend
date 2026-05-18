/**
 * 파우치 생성·수정용 API 래퍼
 *
 * - 생성(POST): multipart `request`(CombinedAddDto) + optional `pouchImage`
 * - 수정(PATCH): multipart `request`(PouchUpdateDto) + optional `pouchImage`
 * - Spring @RequestPart 패턴 (위시 화장품 수정과 동일)
 *
 * @see lib/wish-cosmetics.ts
 */
import { customInstance } from '@/api/axios-instance';
import {
  getPouchDetail,
  getPouchList,
} from '@/api/generated/pouch-controller/pouch-controller';
import type {
  ApiResponseDTOPouchUpdateDto,
  ApiResponseDTOString,
  CombinedAddDto,
  CosmeticsDto,
  PouchDetailDto,
  PouchUpdateDto,
  WappenDto,
} from '@/api/model';
import { buildPouchUpdateDto } from '@/lib/pouch-canvas';
import { normalizeMultipartImageFile } from '@/lib/wish-cosmetics';

export type CreatePouchMultipartPayload = {
  request: CombinedAddDto;
  pouchImage?: File | Blob;
};

export type UpdatePouchMultipartPayload = {
  request: PouchUpdateDto;
  pouchImage?: File | Blob;
};

const POUCH_LIST_PAGE_PARAMS = {
  pageable: { page: 0, size: 20 },
} as const;

const appendJsonRequestPart = (
  formData: FormData,
  request: CombinedAddDto | PouchUpdateDto,
) => {
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

/**
 * GET 상세 → PATCH `request` 본문 (기존 화장품·와펜·크기·회전 유지)
 * `CosmeticsDto.cosmeticId` = 내 화장품 id (`myCosmeticId`, 파우치 행 id 아님)
 */
export const detailToPouchUpdateDto = (detail: PouchDetailDto): PouchUpdateDto => {
  const cosmeticList: CosmeticsDto[] = (detail.cosmetics ?? [])
    .filter((item) => item.myCosmeticId != null && item.myCosmeticId > 0)
    .map((item) => ({
      cosmeticId: item.myCosmeticId,
      memo: item.memo,
      xpoint: item.xpoint,
      ypoint: item.ypoint,
      zindex: item.zindex,
      size: item.size,
      rotationAngle: item.rotationAngle,
    }));

  const wappenList: WappenDto[] = (detail.wappens ?? [])
    .filter((item) => item.wappenId != null)
    .map((item) => ({
      wappenId: item.wappenId,
      xpoint: item.xpoint,
      ypoint: item.ypoint,
      zindex: item.zindex,
      size: item.size,
      rotationAngle: item.rotationAngle,
    }));

  return buildPouchUpdateDto({
    pouchName: detail.name,
    cosmeticList,
    wappenList,
  });
};

const resolvePouchImageUrlFromList = async (
  pouchId: number,
): Promise<string | null> => {
  const listRes = await getPouchList(POUCH_LIST_PAGE_PARAMS);
  const match = listRes.result?.pouchList?.find((item) => item.pouchId === pouchId);
  return match?.imageUrl?.trim() || null;
};

/** POST /api/pouches — 신규 파우치 생성 */
export const createPouchMultipart = async ({
  request,
  pouchImage,
}: CreatePouchMultipartPayload): Promise<ApiResponseDTOString> => {
  const formData = new FormData();
  appendJsonRequestPart(formData, request);

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

/** PATCH /api/pouches/{pouchId} — 화장품·와펜·합성 이미지 (multipart) */
export const updatePouchMultipart = async (
  pouchId: number,
  { request, pouchImage }: UpdatePouchMultipartPayload,
): Promise<ApiResponseDTOPouchUpdateDto> => {
  const formData = new FormData();
  appendJsonRequestPart(formData, request);

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

/**
 * 공유용 합성 이미지 업로드 — 상세 조회 후 PATCH (기존 구성 유지)
 * 공개 HTTPS URL은 목록 `imageUrl`에서 조회합니다.
 */
export const uploadPouchShareImageMultipart = async (
  pouchId: number,
  pouchImage: File | Blob,
): Promise<string | null> => {
  const detailRes = await getPouchDetail(pouchId);
  const detail = detailRes.result;
  if (!detail) {
    return null;
  }

  const request = detailToPouchUpdateDto(detail);
  await updatePouchMultipart(pouchId, { request, pouchImage });

  return resolvePouchImageUrlFromList(pouchId);
};

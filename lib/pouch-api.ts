/**
 * 파우치 생성·수정용 API 래퍼
 *
 * - 생성(POST): multipart `request`(CombinedAddDto) + `pouchImage`(필수)
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

const POUCH_MULTIPART_TIMEOUT_MS = 120_000;
/** 합성 PNG 업로드 최대 변(긴쪽) — 백엔드·프록시 500 방지 */
const POUCH_IMAGE_MAX_SIDE_PX = 768;
const POUCH_IMAGE_TARGET_MAX_BYTES = 200_000;
const POUCH_IMAGE_MIN_SIDE_PX = 320;

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
    new File([JSON.stringify(request)], 'request.json', {
      type: 'application/json',
    }),
  );
};

export const isPouchMultipartServerError = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const status = (err as { response?: { status?: number } }).response?.status;
  return status === 500 || status === 413 || status === 502 || status === 503;
};

/** POST 필수 `pouchImage` 충족용 1×1 PNG (실제 합성은 PATCH /image로 업로드) */
export const createMinimalPouchPlaceholderImage = async (): Promise<File> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error('플레이스홀더 이미지를 만들지 못했습니다.'));
          return;
        }
        resolve(value);
      },
      'image/png',
    );
  });
  return normalizeMultipartImageFile(
    new File([blob], 'pouch.png', { type: 'image/png' }),
    'pouch.png',
  );
};

const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error('파우치 이미지를 불러오지 못했습니다.'));
    };
    img.src = src;
  });
};

/**
 * 합성 캔버스(투명 PNG)를 업로드용 PNG로 리사이즈합니다.
 * JPEG 변환 시 흰 배경이 깔리므로 알파 채널을 유지합니다.
 */
const renderPouchImageToPngBlob = async (
  img: HTMLImageElement,
  maxSide: number,
): Promise<Blob> => {
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  const longest = Math.max(width, height);

  if (longest > maxSide) {
    const scale = maxSide / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('파우치 이미지 변환 캔버스를 초기화할 수 없습니다.');
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('파우치 이미지를 PNG로 변환하지 못했습니다.'));
          return;
        }
        resolve(blob);
      },
      'image/png',
    );
  });

  return pngBlob;
};

export const normalizePouchImageForUpload = async (
  image: File | Blob,
): Promise<File> => {
  const objectUrl = URL.createObjectURL(image);

  try {
    const img = await loadImageElement(objectUrl);
    let maxSide = POUCH_IMAGE_MAX_SIDE_PX;
    let pngBlob = await renderPouchImageToPngBlob(img, maxSide);

    while (
      pngBlob.size > POUCH_IMAGE_TARGET_MAX_BYTES &&
      maxSide > POUCH_IMAGE_MIN_SIDE_PX
    ) {
      maxSide = Math.round(maxSide * 0.75);
      pngBlob = await renderPouchImageToPngBlob(img, maxSide);
    }

    return normalizeMultipartImageFile(
      new File([pngBlob], 'pouch.png', { type: 'image/png' }),
      'pouch.png',
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const toPouchImageFile = async (image: File | Blob): Promise<File> => {
  return normalizePouchImageForUpload(image);
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

  if (pouchImage) {
    const file = await toPouchImageFile(pouchImage);
    formData.append('pouchImage', file, file.name);
  }

  appendJsonRequestPart(formData, request);

  return customInstance({
    url: '/api/pouches',
    method: 'POST',
    data: formData,
    timeout: POUCH_MULTIPART_TIMEOUT_MS,
  });
};

/** PATCH /api/pouches/{pouchId}/image — 합성 이미지만 업로드 */
export const uploadPouchCompositeImageMultipart = async (
  pouchId: number,
  pouchImage: File | Blob,
): Promise<ApiResponseDTOString> => {
  const formData = new FormData();
  const file = await toPouchImageFile(pouchImage);
  formData.append('pouchImage', file, file.name);

  return customInstance({
    url: `/api/pouches/${pouchId}/image`,
    method: 'PATCH',
    data: formData,
    timeout: POUCH_MULTIPART_TIMEOUT_MS,
  });
};

/** PATCH /api/pouches/{pouchId} — 화장품·와펜·합성 이미지 (multipart) */
export const updatePouchMultipart = async (
  pouchId: number,
  { request, pouchImage }: UpdatePouchMultipartPayload,
): Promise<ApiResponseDTOPouchUpdateDto> => {
  const formData = new FormData();

  if (pouchImage) {
    const file = await toPouchImageFile(pouchImage);
    formData.append('pouchImage', file, file.name);
  }

  appendJsonRequestPart(formData, request);

  return customInstance({
    url: `/api/pouches/${pouchId}`,
    method: 'PATCH',
    data: formData,
    timeout: POUCH_MULTIPART_TIMEOUT_MS,
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

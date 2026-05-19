import { toBlob } from 'html-to-image';

import { pickMyCosmeticsStickerImageUrl } from '@/lib/my-cosmetics-display-image';
import { toSameOriginImageProxyUrl } from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import type {
  AddCosmeticDetailDto,
  CombinedAddDto,
  CosmeticsDto,
  PouchUpdateDto,
  WappenDto,
  WappenItemDto,
} from '@/api/model';
import type { PouchCosmeticSelection } from '@/lib/pouch-setup';

export const POUCH_CANVAS_EXPORT_ID = 'pouch-canvas-export';
export const DEFAULT_LAYER_SIZE = 96;
export const POUCH_CANVAS_WIDTH = 320;
export const POUCH_CANVAS_HEIGHT = 460;

/** 화장품 스티커 PNG 알파 외곽선 — Rnd 박스가 아닌 이미지 실루엣에 적용 (html-to-image 캡처 포함) */
export const buildCosmeticStickerOutlineFilter = (
  color = '#ffffff',
  widthPx = 1.25,
): string => {
  const w = widthPx;
  const stroke = [
    `drop-shadow(${w}px 0 0 ${color})`,
    `drop-shadow(-${w}px 0 0 ${color})`,
    `drop-shadow(0 ${w}px 0 ${color})`,
    `drop-shadow(0 -${w}px 0 ${color})`,
    `drop-shadow(${w}px ${w}px 0 ${color})`,
    `drop-shadow(-${w}px ${w}px 0 ${color})`,
    `drop-shadow(${w}px -${w}px 0 ${color})`,
    `drop-shadow(-${w}px -${w}px 0 ${color})`,
  ].join(' ');
  return `${stroke} drop-shadow(0 2px 6px rgba(0,0,0,0.14))`;
};

export const COSMETIC_STICKER_IMAGE_FILTER = buildCosmeticStickerOutlineFilter();

export type CanvasLayerKind = 'cosmetic' | 'wappen';

export type CanvasLayer = {
  id: string;
  kind: CanvasLayerKind;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  /** cosmetic 스티커 — 누끼 bbox 기반 object-position (예: `52.3% 48.1%`) */
  objectPosition?: string;
  /** 파우치 내 배치 행 id (`PouchItemDetailDto.id`, API 전송용 아님) */
  pouchItemId?: number;
  myCosmeticId?: number;
  wappenId?: number;
};

export type CanvasRect = {
  width: number;
  height: number;
};

export const createCanvasLayerId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/** layer.id 중복 시 새 id를 부여합니다 (드래프트·복원 데이터 방어). */
export const ensureUniqueCanvasLayerIds = (
  layers: CanvasLayer[],
): CanvasLayer[] => {
  const seen = new Set<string>();
  return layers.map((layer) => {
    if (!seen.has(layer.id)) {
      seen.add(layer.id);
      return layer;
    }
    const id = createCanvasLayerId();
    seen.add(id);
    return { ...layer, id };
  });
};

export const createCenteredLayer = (
  kind: CanvasLayerKind,
  src: string,
  canvasRect: CanvasRect,
  options: {
    myCosmeticId?: number;
    wappenId?: number;
    zIndex: number;
    size?: number;
  },
): CanvasLayer => {
  const size = options.size ?? DEFAULT_LAYER_SIZE;
  const x = Math.max(0, (canvasRect.width - size) / 2);
  const y = Math.max(0, (canvasRect.height - size) / 2);

  return {
    id: createCanvasLayerId(),
    kind,
    src,
    x,
    y,
    width: size,
    height: size,
    zIndex: options.zIndex,
    rotation: 0,
    myCosmeticId: options.myCosmeticId,
    wappenId: options.wappenId,
  };
};

const clampApiCoordinate = (value: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return Math.round(max / 2);
  }
  return Math.min(max, Math.max(0, Math.round(value)));
};

export const layerCenterToApiPoint = (
  layer: CanvasLayer,
  canvasRect: CanvasRect,
) => {
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  const xpoint = clampApiCoordinate(
    (centerX / canvasRect.width) * POUCH_CANVAS_WIDTH,
    POUCH_CANVAS_WIDTH,
  );
  const ypoint = clampApiCoordinate(
    (centerY / canvasRect.height) * POUCH_CANVAS_HEIGHT,
    POUCH_CANVAS_HEIGHT,
  );
  return { xpoint, ypoint, zindex: layer.zIndex };
};

export const layerSizeToApi = (
  layer: CanvasLayer,
  canvasRect: CanvasRect,
): number => {
  if (canvasRect.width <= 0) {
    return DEFAULT_LAYER_SIZE;
  }
  return clampApiCoordinate(
    (layer.width / canvasRect.width) * POUCH_CANVAS_WIDTH,
    POUCH_CANVAS_WIDTH,
  );
};

export const apiSizeToLayerWidth = (
  size: number | undefined,
  canvasRect: CanvasRect,
): number => {
  if (size == null || !Number.isFinite(size) || size <= 0) {
    return DEFAULT_LAYER_SIZE;
  }
  if (canvasRect.width <= 0) {
    return DEFAULT_LAYER_SIZE;
  }
  return (size / POUCH_CANVAS_WIDTH) * canvasRect.width;
};

const layerRotationToApi = (rotation: number | undefined): number => {
  if (rotation == null || !Number.isFinite(rotation)) {
    return 0;
  }
  return Math.round(rotation);
};

const dedupeCosmeticItemsByMyCosmeticId = (
  items: AddCosmeticDetailDto[],
): AddCosmeticDetailDto[] => {
  const byMyCosmeticId = new Map<number, AddCosmeticDetailDto>();
  for (const item of items) {
    const myCosmeticId = item.myCosmeticId;
    if (myCosmeticId == null || !Number.isFinite(myCosmeticId) || myCosmeticId <= 0) {
      continue;
    }
    const existing = byMyCosmeticId.get(myCosmeticId);
    if (!existing || (item.zindex ?? 0) >= (existing.zindex ?? 0)) {
      byMyCosmeticId.set(myCosmeticId, item);
    }
  }
  return [...byMyCosmeticId.values()].sort(
    (a, b) => (a.zindex ?? 0) - (b.zindex ?? 0),
  );
};

/** 캔버스 스티커 없이 선택만 된 화장품은 기본 좌표로 보강 */
export const mergeSelectionsIntoCosmeticItems = (
  cosmeticItems: AddCosmeticDetailDto[],
  selections: PouchCosmeticSelection[],
): AddCosmeticDetailDto[] => {
  const merged = dedupeCosmeticItemsByMyCosmeticId(cosmeticItems);
  const byMyCosmeticId = new Map(
    merged.map((item) => [item.myCosmeticId as number, item]),
  );
  const centerX = Math.round(POUCH_CANVAS_WIDTH / 2);
  const centerY = Math.round(POUCH_CANVAS_HEIGHT / 2);
  let nextZIndex =
    merged.reduce((max, item) => Math.max(max, item.zindex ?? 0), 0) + 1;

  for (const selection of selections) {
    const myCosmeticId = selection.myCosmeticId;
    if (!Number.isFinite(myCosmeticId) || myCosmeticId <= 0) {
      continue;
    }
    const memo = selection.memo?.trim();
    const existing = byMyCosmeticId.get(myCosmeticId);
    if (existing) {
      if (memo && !(existing.memo ?? '').trim()) {
        byMyCosmeticId.set(myCosmeticId, { ...existing, memo });
      }
      continue;
    }
    byMyCosmeticId.set(myCosmeticId, {
      myCosmeticId,
      xpoint: centerX,
      ypoint: centerY,
      zindex: nextZIndex,
      size: DEFAULT_LAYER_SIZE,
      rotationAngle: 0,
      ...(memo ? { memo } : {}),
    });
    nextZIndex += 1;
  }

  return dedupeCosmeticItemsByMyCosmeticId([...byMyCosmeticId.values()]);
};

export const apiPointToLayerPosition = (
  xpoint: number,
  ypoint: number,
  canvasRect: CanvasRect,
  apiSize?: number,
) => {
  const width = apiSizeToLayerWidth(apiSize, canvasRect);
  const centerX = (xpoint / POUCH_CANVAS_WIDTH) * canvasRect.width;
  const centerY = (ypoint / POUCH_CANVAS_HEIGHT) * canvasRect.height;
  return {
    x: Math.max(0, centerX - width / 2),
    y: Math.max(0, centerY - width / 2),
    width,
    height: width,
  };
};

export const layersToSavePayload = (
  layers: CanvasLayer[],
  selections: PouchCosmeticSelection[],
  canvasRect: CanvasRect,
): {
  cosmeticItems: AddCosmeticDetailDto[];
  wappenItems: WappenItemDto[];
} => {
  const memoByCosmeticId = new Map(
    selections.map((s) => [s.myCosmeticId, s.memo?.trim()]),
  );

  const cosmeticItems: AddCosmeticDetailDto[] = [];
  const wappenItems: WappenItemDto[] = [];

  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sorted) {
    const { xpoint, ypoint, zindex } = layerCenterToApiPoint(layer, canvasRect);

    if (layer.kind === 'cosmetic' && layer.myCosmeticId != null) {
      const memo = memoByCosmeticId.get(layer.myCosmeticId);
      cosmeticItems.push({
        myCosmeticId: layer.myCosmeticId,
        xpoint,
        ypoint,
        zindex,
        size: layerSizeToApi(layer, canvasRect),
        rotationAngle: layerRotationToApi(layer.rotation),
        ...(memo ? { memo } : {}),
      });
    }

    if (layer.kind === 'wappen' && layer.wappenId != null) {
      wappenItems.push({
        wappenId: layer.wappenId,
        xpoint,
        ypoint,
        zindex,
        size: layerSizeToApi(layer, canvasRect),
        rotationAngle: layerRotationToApi(layer.rotation),
      });
    }
  }

  return {
    cosmeticItems: dedupeCosmeticItemsByMyCosmeticId(cosmeticItems),
    wappenItems,
  };
};

const dedupeCosmeticsByCosmeticId = (
  items: CosmeticsDto[],
): CosmeticsDto[] => {
  const byCosmeticId = new Map<number, CosmeticsDto>();
  for (const item of items) {
    const cosmeticId = item.cosmeticId;
    if (cosmeticId == null || !Number.isFinite(cosmeticId) || cosmeticId <= 0) {
      continue;
    }
    const existing = byCosmeticId.get(cosmeticId);
    if (!existing || (item.zindex ?? 0) >= (existing.zindex ?? 0)) {
      byCosmeticId.set(cosmeticId, item);
    }
  }
  return [...byCosmeticId.values()].sort(
    (a, b) => (a.zindex ?? 0) - (b.zindex ?? 0),
  );
};

export const layersToUpdatePayload = (
  layers: CanvasLayer[],
  selections: PouchCosmeticSelection[],
  canvasRect: CanvasRect,
): {
  cosmeticList: CosmeticsDto[];
  wappenList: WappenDto[];
} => {
  const memoByCosmeticId = new Map(
    selections.map((s) => [s.myCosmeticId, s.memo?.trim()]),
  );

  const cosmeticList: CosmeticsDto[] = [];
  const wappenList: WappenDto[] = [];
  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sorted) {
    const { xpoint, ypoint, zindex } = layerCenterToApiPoint(layer, canvasRect);
    const size = layerSizeToApi(layer, canvasRect);
    const rotationAngle = layerRotationToApi(layer.rotation);

    if (layer.kind === 'cosmetic' && layer.myCosmeticId != null) {
      const memo = memoByCosmeticId.get(layer.myCosmeticId);
      cosmeticList.push({
        cosmeticId: layer.myCosmeticId,
        xpoint,
        ypoint,
        zindex,
        size,
        rotationAngle,
        ...(memo ? { memo } : {}),
      });
    }

    if (layer.kind === 'wappen' && layer.wappenId != null) {
      wappenList.push({
        wappenId: layer.wappenId,
        xpoint,
        ypoint,
        zindex,
        size,
        rotationAngle,
      });
    }
  }

  return { cosmeticList: dedupeCosmeticsByCosmeticId(cosmeticList), wappenList };
};

export const mergeSelectionsIntoCosmeticList = (
  cosmeticList: CosmeticsDto[],
  selections: PouchCosmeticSelection[],
  myCosmeticIdsOnCanvas: ReadonlySet<number> = new Set(),
): CosmeticsDto[] => {
  const merged = dedupeCosmeticsByCosmeticId(cosmeticList);
  const byCosmeticId = new Map(
    merged.map((item) => [item.cosmeticId as number, item]),
  );
  const centerX = Math.round(POUCH_CANVAS_WIDTH / 2);
  const centerY = Math.round(POUCH_CANVAS_HEIGHT / 2);
  let nextZIndex =
    merged.reduce((max, item) => Math.max(max, item.zindex ?? 0), 0) + 1;

  for (const selection of selections) {
    const myCosmeticId = selection.myCosmeticId;
    if (!Number.isFinite(myCosmeticId) || myCosmeticId <= 0) {
      continue;
    }
    if (myCosmeticIdsOnCanvas.has(myCosmeticId)) {
      continue;
    }
    const memo = selection.memo?.trim();
    if (byCosmeticId.has(myCosmeticId)) {
      continue;
    }
    byCosmeticId.set(myCosmeticId, {
      cosmeticId: myCosmeticId,
      xpoint: centerX,
      ypoint: centerY,
      zindex: nextZIndex,
      size: DEFAULT_LAYER_SIZE,
      rotationAngle: 0,
      ...(memo ? { memo } : {}),
    });
    nextZIndex += 1;
  }

  return dedupeCosmeticsByCosmeticId([...byCosmeticId.values()]);
};

export type BuildCombinedAddDtoParams = {
  pouchName?: string;
  cosmeticItems: AddCosmeticDetailDto[];
  wappenItems: WappenItemDto[];
};

const POUCH_API_MEMO_MAX_LEN = 60;

const sanitizeAddCosmeticItemsForApi = (
  items: AddCosmeticDetailDto[],
): AddCosmeticDetailDto[] => {
  return items.flatMap((item) => {
    const myCosmeticId = item.myCosmeticId;
    if (myCosmeticId == null || !Number.isFinite(myCosmeticId) || myCosmeticId <= 0) {
      return [];
    }
    const memo = item.memo?.trim();
    return [
      {
        myCosmeticId,
        xpoint: Math.max(0, Math.round(item.xpoint ?? 0)),
        ypoint: Math.max(0, Math.round(item.ypoint ?? 0)),
        zindex: Math.max(1, Math.round(item.zindex ?? 1)),
        size: Math.max(1, Math.round(item.size ?? DEFAULT_LAYER_SIZE)),
        rotationAngle: Math.round(item.rotationAngle ?? 0),
        ...(memo ? { memo: memo.slice(0, POUCH_API_MEMO_MAX_LEN) } : {}),
      },
    ];
  });
};

const sanitizeWappenItemsForApi = (
  items: WappenItemDto[],
): WappenItemDto[] => {
  return items.flatMap((item) => {
    const wappenId = item.wappenId;
    if (wappenId == null || !Number.isFinite(wappenId) || wappenId <= 0) {
      return [];
    }
    return [
      {
        wappenId,
        xpoint: Math.max(0, Math.round(item.xpoint ?? 0)),
        ypoint: Math.max(0, Math.round(item.ypoint ?? 0)),
        zindex: Math.max(1, Math.round(item.zindex ?? 1)),
        size: Math.max(1, Math.round(item.size ?? DEFAULT_LAYER_SIZE)),
        rotationAngle: Math.round(item.rotationAngle ?? 0),
      },
    ];
  });
};

const sanitizeWappenListForApi = (items: WappenDto[]): WappenDto[] => {
  return items.flatMap((item) => {
    const wappenId = item.wappenId;
    if (wappenId == null || !Number.isFinite(wappenId) || wappenId <= 0) {
      return [];
    }
    return [
      {
        wappenId,
        xpoint: Math.max(0, Math.round(item.xpoint ?? 0)),
        ypoint: Math.max(0, Math.round(item.ypoint ?? 0)),
        zindex: Math.max(1, Math.round(item.zindex ?? 1)),
        size: Math.max(1, Math.round(item.size ?? DEFAULT_LAYER_SIZE)),
        rotationAngle: Math.round(item.rotationAngle ?? 0),
      },
    ];
  });
};

export const buildCombinedAddDto = ({
  pouchName,
  cosmeticItems,
  wappenItems,
}: BuildCombinedAddDtoParams): CombinedAddDto => {
  const trimmedName = pouchName?.trim();
  const payload: CombinedAddDto = {
    ...(trimmedName ? { pouchName: trimmedName } : {}),
    cosmeticList: {
      items: sanitizeAddCosmeticItemsForApi(cosmeticItems),
    },
  };

  const sanitizedWappens = sanitizeWappenItemsForApi(wappenItems);
  if (sanitizedWappens.length > 0) {
    payload.wappenList = {
      items: sanitizedWappens,
    };
  }

  return payload;
};

export type BuildPouchUpdateDtoParams = {
  pouchName?: string;
  cosmeticList: CosmeticsDto[];
  wappenList: WappenDto[];
};

/** PATCH /api/pouches/{id} — `PouchUpdateDto` (수정 전용) */
export const buildPouchUpdateDto = ({
  pouchName,
  cosmeticList,
  wappenList,
}: BuildPouchUpdateDtoParams): PouchUpdateDto => {
  const trimmedName = pouchName?.trim();
  const payload: PouchUpdateDto = {
    cosmeticList,
  };

  if (trimmedName) {
    payload.theme = trimmedName;
  }

  const sanitizedWappens = sanitizeWappenListForApi(wappenList);
  if (sanitizedWappens.length > 0) {
    payload.wappenList = sanitizedWappens;
  }

  return payload;
};

const waitForImageElement = (img: HTMLImageElement): Promise<void> => {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('파우치 스티커 이미지를 불러오지 못했습니다.'));
    };
    const cleanup = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
  });
};

/** html-to-image 캡처 전 캔버스 내 img 로드 완료 대기 */
export const waitForCanvasImages = async (
  element: HTMLElement,
): Promise<void> => {
  const images = Array.from(element.querySelectorAll('img'));
  if (images.length === 0) {
    return;
  }
  await Promise.all(images.map((img) => waitForImageElement(img)));
};

export const exportPouchCanvas = async (
  element: HTMLElement,
): Promise<Blob> => {
  await waitForCanvasImages(element);

  const blob = await toBlob(element, {
    cacheBust: false,
    pixelRatio: 2,
    skipFonts: true,
    backgroundColor: null as unknown as string,
    fetchRequestInit: {
      credentials: 'same-origin',
    },
  });

  if (!blob) {
    throw new Error('파우치 이미지를 생성하지 못했습니다.');
  }

  return blob;
};

const sanitizeAbsoluteImageUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes(' ')) {
      return url;
    }
    parsed.pathname = parsed.pathname
      .split('/')
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/');
    return parsed.toString();
  } catch {
    return url.replace(/ /g, '%20');
  }
};

const toPouchLayerImageSrc = (raw: string | null | undefined) => {
  const resolved = resolveMediaUrl(raw);
  if (!resolved) {
    return '';
  }
  const absolute =
    /^https?:\/\//i.test(resolved) ? sanitizeAbsoluteImageUrl(resolved) : resolved;
  return toSameOriginImageProxyUrl(absolute);
};

export const getCosmeticImageSrc = (item: {
  captureUrl?: string | null;
  imgUrl?: string | null;
}) => {
  const raw = pickMyCosmeticsStickerImageUrl(item);
  return toPouchLayerImageSrc(raw);
};

/** OpenAPI imageUrl 추가 전·후 모두 대응 */
export const getCanvasRectFromElement = (
  element: HTMLElement | null,
): CanvasRect => {
  if (!element) {
    return { width: POUCH_CANVAS_WIDTH, height: POUCH_CANVAS_HEIGHT };
  }
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width > 0 ? rect.width : POUCH_CANVAS_WIDTH,
    height: rect.height > 0 ? rect.height : POUCH_CANVAS_HEIGHT,
  };
};

/** 저장 시 캔버스 크기와 복원 시 DOM 크기가 다를 때 레이어 좌표·크기를 비율 스케일합니다. */
export const scaleLayersToCanvasRect = (
  layers: CanvasLayer[],
  fromRect: CanvasRect,
  toRect: CanvasRect,
): CanvasLayer[] => {
  if (fromRect.width <= 0 || fromRect.height <= 0) {
    return layers;
  }
  const scaleX = toRect.width / fromRect.width;
  const scaleY = toRect.height / fromRect.height;
  return layers.map((layer) => ({
    ...layer,
    x: layer.x * scaleX,
    y: layer.y * scaleY,
    width: layer.width * scaleX,
    height: layer.height * scaleY,
  }));
};

export const getWappenImageSrc = (wappen: {
  wappenId?: number;
  imageUrl?: string | null;
}) => {
  const url = wappen.imageUrl?.trim();
  if (url) {
    return toPouchLayerImageSrc(url);
  }
  if (wappen.wappenId != null && wappen.wappenId > 0) {
    return `/api/wappens/${wappen.wappenId}/image`;
  }
  return '';
};

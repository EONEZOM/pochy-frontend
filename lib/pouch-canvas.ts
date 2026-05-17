import { toBlob } from 'html-to-image';

import { toSameOriginImageProxyUrl } from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import type {
  AddCosmeticDetailDto,
  CombinedAddDto,
  WappenItemDto,
} from '@/api/model';
import type { PouchCosmeticSelection } from '@/lib/pouch-setup';

export const POUCH_CANVAS_EXPORT_ID = 'pouch-canvas-export';
export const DEFAULT_LAYER_SIZE = 96;
export const POUCH_CANVAS_WIDTH = 320;
export const POUCH_CANVAS_HEIGHT = 460;

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
  size: number = DEFAULT_LAYER_SIZE,
) => {
  const centerX = (xpoint / POUCH_CANVAS_WIDTH) * canvasRect.width;
  const centerY = (ypoint / POUCH_CANVAS_HEIGHT) * canvasRect.height;
  return {
    x: Math.max(0, centerX - size / 2),
    y: Math.max(0, centerY - size / 2),
    width: size,
    height: size,
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
        ...(memo ? { memo } : {}),
      });
    }

    if (layer.kind === 'wappen' && layer.wappenId != null) {
      wappenItems.push({
        wappenId: layer.wappenId,
        xpoint,
        ypoint,
        zindex,
      });
    }
  }

  return {
    cosmeticItems: dedupeCosmeticItemsByMyCosmeticId(cosmeticItems),
    wappenItems,
  };
};

export type BuildCombinedAddDtoParams = {
  pouchName?: string;
  cosmeticItems: AddCosmeticDetailDto[];
  wappenItems: WappenItemDto[];
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
      items: cosmeticItems,
    },
  };

  if (wappenItems.length > 0) {
    payload.wappenList = {
      items: wappenItems,
    };
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
    fetchRequestInit: {
      credentials: 'same-origin',
    },
  });

  if (!blob) {
    throw new Error('파우치 이미지를 생성하지 못했습니다.');
  }

  return blob;
};

const toPouchLayerImageSrc = (raw: string | null | undefined) => {
  const resolved = resolveMediaUrl(raw);
  if (!resolved) {
    return '';
  }
  return toSameOriginImageProxyUrl(resolved);
};

export const getCosmeticImageSrc = (item: {
  captureUrl?: string | null;
  imgUrl?: string | null;
}) => {
  const capture = item.captureUrl?.trim();
  if (capture) {
    return toPouchLayerImageSrc(capture);
  }
  return toPouchLayerImageSrc(item.imgUrl);
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
  if (wappen.wappenId != null) {
    return `/api/wappens/${wappen.wappenId}/image`;
  }
  return '';
};

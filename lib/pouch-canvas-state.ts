import type { CanvasLayer, CanvasRect } from '@/lib/pouch-canvas';

const POUCH_CANVAS_STATE_KEY_PREFIX = 'pouchCanvasState:';

export type PouchCanvasState = {
  version: 1;
  pouchId: number;
  layers: CanvasLayer[];
  selectedOrder: number[];
  itemMemos: Record<number, string>;
  nextZIndex: number;
  canvasRect: CanvasRect;
  updatedAt: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isCanvasRect = (value: unknown): value is CanvasRect => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.width === 'number' &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    typeof value.height === 'number' &&
    Number.isFinite(value.height) &&
    value.height > 0
  );
};

const isCanvasLayer = (value: unknown): value is CanvasLayer => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    (value.kind === 'cosmetic' || value.kind === 'wappen') &&
    typeof value.src === 'string' &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.zIndex === 'number'
  );
};

const parsePouchCanvasState = (raw: string): PouchCanvasState | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) {
      return null;
    }

    const pouchId = parsed.pouchId;
    if (typeof pouchId !== 'number' || !Number.isFinite(pouchId) || pouchId <= 0) {
      return null;
    }

    const layers = Array.isArray(parsed.layers)
      ? parsed.layers.filter(isCanvasLayer)
      : [];
    const selectedOrder = Array.isArray(parsed.selectedOrder)
      ? parsed.selectedOrder.filter(
          (id): id is number => typeof id === 'number' && Number.isFinite(id),
        )
      : [];
    const itemMemos: Record<number, string> = {};
    if (isRecord(parsed.itemMemos)) {
      for (const [key, value] of Object.entries(parsed.itemMemos)) {
        const id = Number.parseInt(key, 10);
        if (Number.isFinite(id) && typeof value === 'string') {
          itemMemos[id] = value;
        }
      }
    }
    const nextZIndex =
      typeof parsed.nextZIndex === 'number' && parsed.nextZIndex > 0
        ? parsed.nextZIndex
        : 1;
    const canvasRect = isCanvasRect(parsed.canvasRect)
      ? parsed.canvasRect
      : { width: 320, height: 460 };
    const updatedAt =
      typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now();

    return {
      version: 1,
      pouchId,
      layers,
      selectedOrder,
      itemMemos,
      nextZIndex,
      canvasRect,
      updatedAt,
    };
  } catch {
    return null;
  }
};

const getStorageKey = (pouchId: number) => {
  return `${POUCH_CANVAS_STATE_KEY_PREFIX}${pouchId}`;
};

export const readPouchCanvasState = (pouchId: number): PouchCanvasState | null => {
  if (typeof window === 'undefined' || !Number.isFinite(pouchId) || pouchId <= 0) {
    return null;
  }
  const raw = window.localStorage.getItem(getStorageKey(pouchId));
  if (!raw) {
    return null;
  }
  const state = parsePouchCanvasState(raw);
  if (state == null || state.pouchId !== pouchId) {
    return null;
  }
  return state;
};

export const savePouchCanvasState = (
  pouchId: number,
  input: Omit<PouchCanvasState, 'version' | 'pouchId' | 'updatedAt'>,
) => {
  if (typeof window === 'undefined' || !Number.isFinite(pouchId) || pouchId <= 0) {
    return;
  }

  const payload: PouchCanvasState = {
    version: 1,
    pouchId,
    ...input,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(getStorageKey(pouchId), JSON.stringify(payload));
};

export const clearPouchCanvasState = (pouchId: number) => {
  if (typeof window === 'undefined' || !Number.isFinite(pouchId) || pouchId <= 0) {
    return;
  }
  window.localStorage.removeItem(getStorageKey(pouchId));
};

import type { CanvasLayer } from '@/lib/pouch-canvas';

export const POUCH_DRAFT_STORAGE_KEY = 'pouchDraft';

export type PouchDraftStep = 'select' | 'decorate';

export type PouchDraftState = {
  version: 1;
  pouchName: string;
  step: PouchDraftStep;
  selectedOrder: number[];
  itemMemos: Record<number, string>;
  layers: CanvasLayer[];
  nextZIndex: number;
  updatedAt: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
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

const parsePouchDraft = (raw: string): PouchDraftState | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) {
      return null;
    }

    const pouchName =
      typeof parsed.pouchName === 'string' ? parsed.pouchName : '';
    const step = parsed.step === 'decorate' ? 'decorate' : 'select';
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
    const layers = Array.isArray(parsed.layers)
      ? parsed.layers.filter(isCanvasLayer)
      : [];
    const nextZIndex =
      typeof parsed.nextZIndex === 'number' && parsed.nextZIndex > 0
        ? parsed.nextZIndex
        : 1;
    const updatedAt =
      typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now();

    return {
      version: 1,
      pouchName,
      step,
      selectedOrder,
      itemMemos,
      layers,
      nextZIndex,
      updatedAt,
    };
  } catch {
    return null;
  }
};

export const readPouchDraft = (): PouchDraftState | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(POUCH_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  return parsePouchDraft(raw);
};

export const savePouchDraft = (draft: Omit<PouchDraftState, 'version' | 'updatedAt'>) => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: PouchDraftState = {
    version: 1,
    ...draft,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(POUCH_DRAFT_STORAGE_KEY, JSON.stringify(payload));
};

export const clearPouchDraft = () => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(POUCH_DRAFT_STORAGE_KEY);
};

export const hasPouchDraft = (): boolean => {
  const draft = readPouchDraft();
  if (!draft) {
    return false;
  }

  return (
    draft.pouchName.trim().length > 0 ||
    draft.selectedOrder.length > 0 ||
    draft.layers.length > 0
  );
};

/** items 화면 재진입 시 모달 표시 여부 (이름만 있는 경우는 create 직후 fresh=1로 제외) */
export const hasPouchDraftForItemsResume = (): boolean => {
  const draft = readPouchDraft();
  if (!draft) {
    return false;
  }

  return (
    draft.selectedOrder.length > 0 ||
    draft.layers.length > 0 ||
    draft.step === 'decorate'
  );
};

export const buildPouchItemsResumePath = (pouchName: string) => {
  const trimmed = pouchName.trim();
  const query = new URLSearchParams();
  if (trimmed) {
    query.set('name', trimmed);
  }
  query.set('resume', '1');
  return `/my-cosmetics/pouch/draft/items?${query.toString()}`;
};

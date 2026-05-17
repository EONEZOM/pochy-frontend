import type {
  AddCosmeticDetailDto,
  ApiResponseDTOString,
  ApiResponseDTOPouchListDto,
  CombinedAddDto,
} from '@/api/model';
import {
  addCosmeticsToPouch,
  getPouchList,
  updatePouch,
  uploadPouchCompositeImage,
} from '@/api/generated/pouch-controller/pouch-controller';
import {
  buildCombinedAddDto,
  layersToSavePayload,
  type CanvasLayer,
  type CanvasRect,
} from '@/lib/pouch-canvas';

export const PENDING_POUCH_NAME_KEY = 'pendingPouchName';
export const PENDING_POUCH_ID_KEY = 'pendingPouchId';
export const POUCH_REGISTER_RETURN_PATH_KEY = 'myCosmeticsRegisterReturnPath';
export const DRAFT_POUCH_ID = 'draft';

export const POUCH_LIST_PAGE_PARAMS = {
  pageable: { page: 0, size: 20 },
} as const;

export const getPouchListQueryKey = () =>
  ['/api/pouches', POUCH_LIST_PAGE_PARAMS] as const;

export const fetchPouchList = async () => {
  return getPouchList(POUCH_LIST_PAGE_PARAMS);
};

const POUCH_ITEM_LAYOUT_BASE_X = 80;
const POUCH_ITEM_LAYOUT_BASE_Y = 120;
const POUCH_ITEM_LAYOUT_STEP_X = 72;
const POUCH_ITEM_LAYOUT_STEP_Y = 72;

/** OpenAPI 미기재 — 신규 파우치 생성 시 백엔드가 받을 수 있는 필드 */
type AddCosmeticListWithName = {
  pouchId?: number;
  name?: string;
  pouchName?: string;
  items?: AddCosmeticDetailDto[];
};

const toCombinedAddDto = (
  cosmeticList: AddCosmeticListWithName,
): CombinedAddDto => ({
  cosmeticList: cosmeticList as CombinedAddDto['cosmeticList'],
});

const isAxiosError = (err: unknown): err is {
  response?: { status?: number; data?: unknown };
} => {
  return typeof err === 'object' && err !== null && 'response' in err;
};

export const savePendingPouchName = (name: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(PENDING_POUCH_NAME_KEY, name);
};

export const readPendingPouchName = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(PENDING_POUCH_NAME_KEY);
};

export const clearPendingPouchName = () => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.removeItem(PENDING_POUCH_NAME_KEY);
};

export const savePendingPouchId = (pouchId: number) => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(PENDING_POUCH_ID_KEY, String(pouchId));
};

export const readPendingPouchId = (): number | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(PENDING_POUCH_ID_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const clearPendingPouchId = () => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.removeItem(PENDING_POUCH_ID_KEY);
};

export const savePouchRegisterReturnPath = (path: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(POUCH_REGISTER_RETURN_PATH_KEY, path);
};

export const readPouchRegisterReturnPath = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(POUCH_REGISTER_RETURN_PATH_KEY);
};

export const clearPouchRegisterReturnPath = () => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.removeItem(POUCH_REGISTER_RETURN_PATH_KEY);
};

export const buildPouchItemsPath = (pouchId: string, pouchName: string) => {
  const query = pouchName.trim()
    ? `?name=${encodeURIComponent(pouchName.trim())}`
    : '';
  return `/my-cosmetics/pouch/${pouchId}/items${query}`;
};

export const isDraftPouchId = (pouchId: string) => {
  return pouchId === DRAFT_POUCH_ID;
};

const parsePouchIdFromAddResponse = (
  response: ApiResponseDTOString,
): number | null => {
  const raw = response.result?.trim();
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return null;
};

const extractPouchIds = (list: ApiResponseDTOPouchListDto | undefined) => {
  const pouches = list?.result?.pouchList ?? [];
  return pouches
    .map((pouch) => pouch.pouchId)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
};

const fetchLatestPouchId = async (): Promise<number | null> => {
  const list = await fetchPouchList();
  const ids = extractPouchIds(list);
  if (ids.length === 0) {
    return null;
  }
  return Math.max(...ids);
};

const buildPouchCosmeticItems = (
  selections: PouchCosmeticSelection[],
): AddCosmeticDetailDto[] => {
  return selections.map(({ myCosmeticId, memo }, index) => {
    const x = POUCH_ITEM_LAYOUT_BASE_X + (index % 4) * POUCH_ITEM_LAYOUT_STEP_X;
    const y =
      POUCH_ITEM_LAYOUT_BASE_Y + Math.floor(index / 4) * POUCH_ITEM_LAYOUT_STEP_Y;
    const z = index + 1;
    return {
      myCosmeticId,
      xpoint: x,
      ypoint: y,
      zindex: z,
      ...(memo ? { memo } : {}),
    };
  });
};

const validatePouchSelections = (selections: PouchCosmeticSelection[]) => {
  if (selections.length === 0) {
    throw new Error('파우치에 넣을 화장품을 선택해 주세요.');
  }
  const hasInvalidId = selections.some(
    (selection) =>
      !Number.isFinite(selection.myCosmeticId) || selection.myCosmeticId <= 0,
  );
  if (hasInvalidId) {
    throw new Error('선택한 화장품 정보가 올바르지 않습니다. 다시 선택해 주세요.');
  }
};

const resolvePouchIdAfterAdd = async (
  addResponse: ApiResponseDTOString,
): Promise<number> => {
  const fromResponse = parsePouchIdFromAddResponse(addResponse);
  if (fromResponse != null) {
    return fromResponse;
  }
  const latest = await fetchLatestPouchId();
  if (latest != null) {
    return latest;
  }
  throw new Error('파우치를 생성하지 못했습니다.');
};

const patchPouchNameIfNeeded = async (pouchId: number, name: string) => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return;
  }
  try {
    await updatePouch(pouchId, { request: { name: trimmedName } });
  } catch {
    // 1차 POST에 이름이 반영됐을 수 있음 — PATCH 실패는 무시
  }
};

const buildBootstrapCosmeticListVariants = (
  name: string,
  items: AddCosmeticDetailDto[],
): AddCosmeticListWithName[] => {
  const trimmedName = name.trim();
  const variants: AddCosmeticListWithName[] = [];

  if (trimmedName) {
    variants.push({ name: trimmedName, items });
    variants.push({ name: trimmedName, pouchName: trimmedName, items });
  }

  variants.push({ items });

  return variants;
};

/**
 * OpenAPI에 POST /api/pouches 없음.
 * 신규 파우치: 이름 + 선택 화장품 전체를 한 번에 POST (분할 추가는 pouchId 확보 후만).
 */
const bootstrapPouchWithItems = async (
  name: string,
  items: AddCosmeticDetailDto[],
): Promise<number> => {
  if (items.length === 0) {
    throw new Error('파우치에 넣을 화장품을 선택해 주세요.');
  }

  const variants = buildBootstrapCosmeticListVariants(name, items);
  let lastError: unknown;

  for (const cosmeticList of variants) {
    try {
      const createRes = await addCosmeticsToPouch(toCombinedAddDto(cosmeticList));
      const pouchId = await resolvePouchIdAfterAdd(createRes);
      await patchPouchNameIfNeeded(pouchId, name);
      return pouchId;
    } catch (err) {
      lastError = err;
      if (!isAxiosError(err) || err.response?.status !== 500) {
        throw err;
      }
    }
  }

  throw lastError ?? new Error('파우치를 생성하지 못했습니다.');
};

const resolvePouchIdForSave = async (
  pouchIdParam: string,
): Promise<number | null> => {
  const numericId = Number.parseInt(pouchIdParam, 10);
  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId;
  }

  const pendingId = readPendingPouchId();
  if (pendingId != null && pendingId > 0) {
    return pendingId;
  }

  if (isDraftPouchId(pouchIdParam)) {
    return null;
  }

  const list = await fetchPouchList();
  const ids = extractPouchIds(list);
  if (ids.length === 0) {
    return null;
  }

  return Math.max(...ids);
};

export type PouchCosmeticSelection = {
  myCosmeticId: number;
  memo?: string;
};

export const buildPouchDetailPath = (pouchId: number, name: string) => {
  const query = name.trim()
    ? `?name=${encodeURIComponent(name.trim())}`
    : '';
  return `/my-cosmetics/pouch/${pouchId}${query}`;
};

export const buildPouchSharePath = (pouchId: number, name: string) => {
  const query = name.trim()
    ? `?name=${encodeURIComponent(name.trim())}`
    : '';
  return `/my-cosmetics/pouch/${pouchId}/share${query}`;
};

export const buildPouchEditItemsPath = (pouchId: number, name: string) => {
  const params = new URLSearchParams();
  if (name.trim()) {
    params.set('name', name.trim());
  }
  params.set('mode', 'edit');
  const query = params.toString();
  return `/my-cosmetics/pouch/${pouchId}/items${query ? `?${query}` : ''}`;
};

export const buildPouchCompletePath = (pouchId: number, name: string) => {
  const query = name.trim()
    ? `?name=${encodeURIComponent(name.trim())}`
    : '';
  return `/my-cosmetics/pouch/${pouchId}/complete${query}`;
};

export const savePouchDecoration = async (
  pouchIdParam: string,
  name: string,
  selections: PouchCosmeticSelection[],
  layers: CanvasLayer[],
  canvasRect: CanvasRect,
  compositeBlob: Blob,
): Promise<number> => {
  validatePouchSelections(selections);

  const trimmedName = name.trim();
  const { cosmeticItems, wappenItems } = layersToSavePayload(
    layers,
    selections,
    canvasRect,
  );

  if (cosmeticItems.length === 0) {
    throw new Error('파우치에 넣을 화장품을 선택해 주세요.');
  }

  let pouchId = await resolvePouchIdForSave(pouchIdParam);

  if (pouchId == null) {
    pouchId = await bootstrapPouchWithItems(trimmedName, cosmeticItems);
    if (wappenItems.length > 0) {
      await addCosmeticsToPouch(
        buildCombinedAddDto(pouchId, [], wappenItems),
      );
    }
  } else {
    await patchPouchNameIfNeeded(pouchId, trimmedName);
    await addCosmeticsToPouch(
      buildCombinedAddDto(pouchId, cosmeticItems, wappenItems),
    );
  }

  await uploadPouchCompositeImage(pouchId, { pouchImage: compositeBlob });
  savePendingPouchId(pouchId);

  return pouchId;
};

export const savePouchWithCosmetics = async (
  pouchIdParam: string,
  name: string,
  selections: PouchCosmeticSelection[],
): Promise<number> => {
  validatePouchSelections(selections);

  const trimmedName = name.trim();
  const items = buildPouchCosmeticItems(selections);
  const pouchId = await resolvePouchIdForSave(pouchIdParam);

  if (pouchId != null) {
    await patchPouchNameIfNeeded(pouchId, trimmedName);
    await addCosmeticsToPouch(
      toCombinedAddDto({
        pouchId,
        items,
      }),
    );
    return pouchId;
  }

  return bootstrapPouchWithItems(trimmedName, items);
};

export const clearPouchSetupSession = () => {
  clearPendingPouchName();
  clearPendingPouchId();
};

export const getPouchSaveErrorMessage = (err: unknown): string => {
  const fallback = '파우치 저장에 실패했습니다. 다시 시도해 주세요.';
  if (typeof err !== 'object' || err === null) {
    return fallback;
  }
  const axiosLike = err as {
    response?: {
      data?: {
        message?: string;
        code?: string;
        detail?: string;
        error?: string;
      };
    };
    message?: string;
  };
  const data = axiosLike.response?.data;
  const serverMessage =
    data?.message?.trim() ||
    (typeof data?.detail === 'string' ? data.detail.trim() : '') ||
    (typeof data?.error === 'string' ? data.error.trim() : '');

  if (serverMessage) {
    return serverMessage;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
};

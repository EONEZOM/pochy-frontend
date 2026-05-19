import type {
  AddCosmeticDetailDto,
  ApiResponseDTOString,
  PouchUpdateDto,
} from '@/api/model';
import { getPouchList } from '@/api/generated/pouch-controller/pouch-controller';
import {
  createMinimalPouchPlaceholderImage,
  createPouchMultipart,
  isPouchMultipartServerError,
  updatePouchMultipart,
  uploadPouchCompositeImageMultipart,
} from '@/lib/pouch-api';
import {
  buildCombinedAddDto,
  buildCosmeticItemsForSave,
  buildCosmeticItemsFromSelectionsGrid,
  buildCosmeticListForSave,
  buildPouchUpdateDto,
  DEFAULT_CANVAS_RECT,
  layersToSavePayload,
  type CanvasLayer,
  type CanvasRect,
} from '@/lib/pouch-canvas';
import { savePouchCanvasState } from '@/lib/pouch-canvas-state';
import { clearPouchDraft } from '@/lib/pouch-draft';

export const PENDING_POUCH_NAME_KEY = 'pendingPouchName';
export const PENDING_POUCH_ID_KEY = 'pendingPouchId';
export const POUCH_REGISTER_RETURN_PATH_KEY = 'myCosmeticsRegisterReturnPath';
export const DRAFT_POUCH_ID = 'draft';

export const POUCH_LIST_PAGE_PARAMS = {
  pageable: { page: 0, size: 100 },
} as const;

export const getPouchListQueryKey = () =>
  ['/api/pouches', POUCH_LIST_PAGE_PARAMS] as const;

export const fetchPouchList = async () => {
  return getPouchList(POUCH_LIST_PAGE_PARAMS);
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

const POUCH_ID_LIST_LOOKUP_MAX_ATTEMPTS = 5;
const POUCH_ID_LIST_LOOKUP_DELAY_MS = 500;

const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
};

/** 생성 응답 result가 문자열·숫자·JSON 객체 등 여러 형태일 수 있어 유연하게 파싱합니다. */
const parsePouchIdFromUnknown = (value: unknown): number | null => {
  const direct = parsePositiveInt(value);
  if (direct != null) {
    return direct;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return parsePouchIdFromUnknown(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = record.pouchId ?? record.id ?? record.result;
    return parsePouchIdFromUnknown(nested);
  }

  return null;
};

const parsePouchIdFromAddResponse = (
  response: ApiResponseDTOString,
): number | null => {
  return (
    parsePouchIdFromUnknown(response.result) ??
    parsePouchIdFromUnknown(response.message) ??
    parsePouchIdFromUnknown(response)
  );
};

const resolvePouchIdFromListByName = async (
  pouchName: string,
): Promise<number | null> => {
  const normalizedName = pouchName.trim();
  if (!normalizedName) {
    return null;
  }

  const lookup = async () => {
    const list = await fetchPouchList();
    const pouches = list?.result?.pouchList ?? [];
    const matches = pouches.filter(
      (pouch) =>
        pouch.name?.trim() === normalizedName &&
        typeof pouch.pouchId === 'number' &&
        pouch.pouchId > 0,
    );
    if (matches.length === 0) {
      return null;
    }
    return Math.max(...matches.map((pouch) => pouch.pouchId as number));
  };

  for (let attempt = 0; attempt < POUCH_ID_LIST_LOOKUP_MAX_ATTEMPTS; attempt += 1) {
    const pouchId = await lookup();
    if (pouchId != null) {
      return pouchId;
    }
    if (attempt < POUCH_ID_LIST_LOOKUP_MAX_ATTEMPTS - 1) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, POUCH_ID_LIST_LOOKUP_DELAY_MS);
      });
    }
  }

  return null;
};

const isPouchImageUploadServerError = isPouchMultipartServerError;

const savePouchDecorationWithImage = async (
  pouchId: number,
  request: PouchUpdateDto,
  compositeBlob: Blob,
) => {
  try {
    await updatePouchMultipart(pouchId, {
      request,
      pouchImage: compositeBlob,
    });
  } catch (err) {
    if (!isPouchImageUploadServerError(err)) {
      throw err;
    }
    await uploadPouchCompositeImageMultipart(pouchId, compositeBlob);
  }
};

const buildPouchCosmeticItems = (
  selections: PouchCosmeticSelection[],
): AddCosmeticDetailDto[] => {
  return buildCosmeticItemsFromSelectionsGrid(selections);
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
  pouchName: string,
): Promise<number> => {
  const fromResponse = parsePouchIdFromAddResponse(addResponse);
  if (fromResponse != null) {
    return fromResponse;
  }

  const fromList = await resolvePouchIdFromListByName(pouchName);
  if (fromList != null) {
    return fromList;
  }

  throw new Error(
    '파우치를 생성했지만 ID를 확인하지 못했습니다. 내 화장품에서 목록을 확인해 주세요.',
  );
};

/** POST /api/pouches — 신규 파우치 + 선택 화장품 */
const bootstrapPouchWithItems = async (
  name: string,
  items: AddCosmeticDetailDto[],
): Promise<number> => {
  if (items.length === 0) {
    throw new Error('파우치에 넣을 화장품을 선택해 주세요.');
  }

  const createRes = await createPouchMultipart({
    request: buildCombinedAddDto({
      pouchName: name,
      cosmeticItems: items,
      wappenItems: [],
    }),
    pouchImage: await createMinimalPouchPlaceholderImage(),
  });

  return resolvePouchIdAfterAdd(createRes, name);
};

const resolvePouchIdForSave = async (
  pouchIdParam: string,
): Promise<number | null> => {
  const numericId = Number.parseInt(pouchIdParam, 10);
  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId;
  }

  if (isDraftPouchId(pouchIdParam)) {
    return null;
  }

  const pendingId = readPendingPouchId();
  if (pendingId != null && pendingId > 0) {
    return pendingId;
  }

  throw new Error('유효하지 않은 파우치 ID입니다.');
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
  let pouchId = await resolvePouchIdForSave(pouchIdParam);

  if (pouchId == null) {
    const { wappenItems } = layersToSavePayload(layers, selections, canvasRect);
    const cosmeticItems = buildCosmeticItemsForSave(
      layers,
      selections,
      canvasRect,
    );

    if (cosmeticItems.length === 0) {
      throw new Error('파우치에 넣을 화장품을 선택해 주세요.');
    }

    const createRequest = buildCombinedAddDto({
      pouchName: trimmedName,
      cosmeticItems,
      wappenItems: [],
    });

    const cosmeticList = buildCosmeticListForSave(
      layers,
      selections,
      canvasRect,
    );
    const updateRequest = buildPouchUpdateDto({
      pouchName: trimmedName,
      cosmeticList,
      wappenList: wappenItems,
    });

    const createRes = await createPouchMultipart({
      request: createRequest,
      pouchImage: await createMinimalPouchPlaceholderImage(),
    });
    pouchId = await resolvePouchIdAfterAdd(createRes, trimmedName);

    await updatePouchMultipart(pouchId, { request: updateRequest });

    try {
      await uploadPouchCompositeImageMultipart(pouchId, compositeBlob);
    } catch (err) {
      if (!isPouchImageUploadServerError(err)) {
        throw err;
      }
      await savePouchDecorationWithImage(pouchId, updateRequest, compositeBlob);
    }
  } else {
    const { wappenItems: wappenList } = layersToSavePayload(
      layers,
      selections,
      canvasRect,
    );
    const cosmeticList = buildCosmeticListForSave(
      layers,
      selections,
      canvasRect,
    );

    if (cosmeticList.length === 0) {
      throw new Error('파우치에 넣을 화장품을 선택해 주세요.');
    }

    const updateRequest = buildPouchUpdateDto({
      pouchName: trimmedName,
      cosmeticList,
      wappenList,
    });
    await savePouchDecorationWithImage(pouchId, updateRequest, compositeBlob);
  }

  savePendingPouchId(pouchId);

  savePouchCanvasState(pouchId, {
    layers,
    selectedOrder: selections.map((s) => s.myCosmeticId),
    itemMemos: Object.fromEntries(
      selections
        .filter((s) => s.memo?.trim())
        .map((s) => [s.myCosmeticId, s.memo!.trim()]),
    ),
    nextZIndex:
      layers.reduce((max, layer) => Math.max(max, layer.zIndex), 0) + 1,
    canvasRect,
  });

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
    const cosmeticList = buildCosmeticItemsFromSelectionsGrid(selections).map(
      (item) => ({
        cosmeticId: item.myCosmeticId,
        memo: item.memo,
        xpoint: item.xpoint,
        ypoint: item.ypoint,
        zindex: item.zindex,
        size: item.size,
        rotationAngle: item.rotationAngle,
      }),
    );
    await updatePouchMultipart(pouchId, {
      request: buildPouchUpdateDto({
        pouchName: trimmedName,
        cosmeticList,
        wappenList: [],
      }),
    });
    return pouchId;
  }

  return bootstrapPouchWithItems(trimmedName, items);
};

export const clearPouchSetupSession = () => {
  clearPendingPouchName();
  clearPendingPouchId();
  clearPouchDraft();
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
  const serverCode = data?.code?.trim();

  if (serverMessage && serverCode) {
    return `${serverMessage} (${serverCode})`;
  }
  if (serverMessage) {
    return serverMessage;
  }
  if (serverCode) {
    return `파우치 저장에 실패했습니다. (${serverCode})`;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
};

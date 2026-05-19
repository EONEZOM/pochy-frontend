'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSearchMyCosmetics } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { getSearchMyCosmeticsQueryKey } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { useGetPouchDetail } from '@/api/generated/pouch-controller/pouch-controller';
import { useGetWappenList } from '@/api/generated/wappen-controller/wappen-controller';
import { useWarmMyCosmeticsItems } from '@/hooks/useWarmRouteImages';
import { ExtraNav } from '@/components/common/ExtraNav';
import { Modal } from '@/components/common/Modal/Modal';
import { Header } from '@/components/layout/Header';
import {
  POUCH_ITEMS_SHEET_SNAP_COLLAPSED,
  POUCH_ITEMS_SHEET_SNAP_EXPANDED,
  POUCH_ITEMS_SHEET_BOTTOM_OFFSET,
  POUCH_ITEMS_SHEET_TOGGLE_RESERVE,
  PouchItemsBottomSheet,
} from '@/components/my-cosmetics/PouchItemsBottomSheet';
import { PouchDraftResumeModal } from '@/components/my-cosmetics/PouchDraftResumeModal';
import { PouchNextButton } from '@/components/my-cosmetics/PouchNextButton';
import {
  clearPouchDraft,
  hasPouchDraftForItemsResume,
  readPouchDraft,
  savePouchDraft,
  type PouchDraftState,
} from '@/lib/pouch-draft';
import {
  buildPouchCompletePath,
  buildPouchItemsPath,
  clearPendingPouchId,
  clearPouchSetupSession,
  fetchPouchList,
  getPouchListQueryKey,
  getPouchSaveErrorMessage,
  readPendingPouchName,
  savePouchDecoration,
  savePouchRegisterReturnPath,
} from '@/lib/pouch-setup';
import {
  POUCH_CANVAS_EXPORT_ID,
  apiPointToLayerPosition,
  createCanvasLayerId,
  createCenteredLayer,
  ensureUniqueCanvasLayerIds,
  exportPouchCanvas,
  getCanvasRectFromElement,
  getCosmeticImageSrc,
  getWappenImageSrc,
  scaleLayersToCanvasRect,
  type CanvasLayer,
  type CanvasRect,
} from '@/lib/pouch-canvas';
import { readPouchCanvasState } from '@/lib/pouch-canvas-state';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import {
  buildSelectionRestoreFromPouchDetailWithLookup,
  POUCH_COSMETIC_SEARCH_SIZE,
  resolvePouchRowCosmeticMatch,
  sanitizeSelectedOrder,
  sortPouchCosmeticRowsByZindex,
  usePouchCosmeticsById,
} from '@/lib/pouch-cosmetic-lookup';
import { deleteMyCosmeticsItems } from '@/lib/my-cosmetics-mutations';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import type { MyCosmeticsResponseDTO, PouchDetailDto } from '@/api/model';

const decorateLoadingFallback = (
  <div className="flex h-full w-full max-w-[320px] items-center justify-center text-sm text-zinc-400">
    장식 화면을 불러오는 중...
  </div>
);

const PouchDecorateCanvas = dynamic(
  () =>
    import('@/components/my-cosmetics/PouchDecorateCanvas').then(
      (mod) => mod.PouchDecorateCanvas,
    ),
  { ssr: false, loading: () => decorateLoadingFallback },
);

const PouchDecorateBottomSheet = dynamic(
  () =>
    import('@/components/my-cosmetics/PouchDecorateBottomSheet').then(
      (mod) => mod.PouchDecorateBottomSheet,
    ),
  { ssr: false, loading: () => decorateLoadingFallback },
);

const POUCHY_SRC = '/figma/my/pouchy.svg';
const SPEECH_BUBBLE_SRC = '/figma/my/말풍선.svg';

const POUCH_EDIT_CANVAS_RECT = {
  width: 320,
  height: 460,
} as const;

type PickerStep = 'select' | 'decorate';

type EditRestorePayload = {
  selectedOrder: number[];
  itemMemos: Record<number, string>;
  layers: CanvasLayer[];
  nextZIndex: number;
  sourceCanvasRect?: CanvasRect;
};

const EMPTY_EDIT_RESTORE_PAYLOAD: EditRestorePayload = {
  selectedOrder: [],
  itemMemos: {},
  layers: [],
  nextZIndex: 1,
};

const buildEditRestorePayloadFromCache = (
  cached: NonNullable<ReturnType<typeof readPouchCanvasState>>,
): EditRestorePayload => {
  return {
    selectedOrder: cached.selectedOrder,
    itemMemos: cached.itemMemos,
    layers: ensureUniqueCanvasLayerIds(cached.layers),
    nextZIndex: cached.nextZIndex,
    sourceCanvasRect: cached.canvasRect,
  };
};

const POUCH_EDIT_DEFAULT_X = 160;
const POUCH_EDIT_DEFAULT_Y = 230;

const resolveApiCoord = (value: number | undefined, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const getEditRestoreLayerKey = (layer: CanvasLayer) => {
  if (layer.kind === 'cosmetic' && layer.myCosmeticId != null) {
    return `c:${layer.myCosmeticId}`;
  }
  if (layer.kind === 'wappen' && layer.wappenId != null) {
    return `w:${layer.wappenId}`;
  }
  return null;
};

/** API 좌표·z-index를 유지하고, 캐시에만 있는 크기·회전을 보조로 합칩니다. */
const mergeEditRestorePayload = (
  apiPayload: EditRestorePayload,
  cachePayload: EditRestorePayload | null,
): EditRestorePayload => {
  if (!cachePayload?.layers.length) {
    return apiPayload;
  }

  const cacheLayerByKey = new Map<string, CanvasLayer>();
  for (const layer of cachePayload.layers) {
    const key = getEditRestoreLayerKey(layer);
    if (key) {
      cacheLayerByKey.set(key, layer);
    }
  }

  const mergedLayers = apiPayload.layers.map((layer) => {
    const key = getEditRestoreLayerKey(layer);
    const cached = key ? cacheLayerByKey.get(key) : undefined;
    if (!cached) {
      return layer;
    }
    return {
      ...layer,
      x: layer.x,
      y: layer.y,
      zIndex: layer.zIndex,
      width: cached.width,
      height: cached.height,
      rotation: cached.rotation,
    };
  });

  return {
    selectedOrder:
      apiPayload.selectedOrder.length > 0
        ? apiPayload.selectedOrder
        : cachePayload.selectedOrder,
    itemMemos: { ...cachePayload.itemMemos, ...apiPayload.itemMemos },
    layers: ensureUniqueCanvasLayerIds(mergedLayers),
    nextZIndex: Math.max(apiPayload.nextZIndex, cachePayload.nextZIndex),
    sourceCanvasRect: cachePayload.sourceCanvasRect,
  };
};

const filterRestorePayloadForSelection = (
  payload: EditRestorePayload,
  currentSelectedOrder: number[],
  validCosmeticIds: ReadonlySet<number>,
): EditRestorePayload => {
  const selectedOrder = sanitizeSelectedOrder(
    currentSelectedOrder,
    validCosmeticIds,
  );
  const selected = new Set(selectedOrder);
  const layers = payload.layers.filter((layer) => {
    if (layer.kind === 'wappen') {
      return true;
    }
    if (layer.kind === 'cosmetic' && layer.myCosmeticId != null) {
      return selected.has(layer.myCosmeticId);
    }
    return false;
  });
  return {
    ...payload,
    selectedOrder,
    layers: ensureUniqueCanvasLayerIds(layers),
  };
};

const buildEditRestorePayload = (
  detail: PouchDetailDto,
  cosmeticsById: Map<number, MyCosmeticsResponseDTO>,
  cosmeticsByNameBrand: Map<string, MyCosmeticsResponseDTO>,
  wappenImageUrlById: Map<number, string>,
): EditRestorePayload => {
  const selectedOrder: number[] = [];
  const seenSelectedIds = new Set<number>();
  const memos: Record<number, string> = {};
  const restoredLayers: CanvasLayer[] = [];
  let nextLayerZIndex = 1;

  for (const c of sortPouchCosmeticRowsByZindex(detail.cosmetics ?? [])) {
    const matched = resolvePouchRowCosmeticMatch(
      c,
      cosmeticsById,
      cosmeticsByNameBrand,
    );
    if (!matched) {
      continue;
    }
    const linkId = matched.id;
    if (linkId == null || linkId <= 0) {
      continue;
    }
    const src = getCosmeticImageSrc(matched);
    if (!src) {
      continue;
    }
    if (!seenSelectedIds.has(linkId)) {
      seenSelectedIds.add(linkId);
      selectedOrder.push(linkId);
    }
    const memo = c.memo?.trim();
    if (memo) {
      memos[linkId] = memo;
    }
    const layerZIndex = c.zindex ?? nextLayerZIndex;
    const pos = apiPointToLayerPosition(
      resolveApiCoord(c.xpoint, POUCH_EDIT_DEFAULT_X),
      resolveApiCoord(c.ypoint, POUCH_EDIT_DEFAULT_Y),
      POUCH_EDIT_CANVAS_RECT,
      c.size,
    );
    restoredLayers.push({
      id: createCanvasLayerId(),
      kind: 'cosmetic',
      src,
      pouchItemId: c.id,
      myCosmeticId: linkId,
      zIndex: layerZIndex,
      rotation: c.rotationAngle ?? 0,
      ...pos,
    });
    nextLayerZIndex = Math.max(nextLayerZIndex, layerZIndex) + 1;
  }

  for (const w of detail.wappens ?? []) {
    const wappenId = w.wappenId;
    if (wappenId == null) {
      continue;
    }
    const src = getWappenImageSrc({
      wappenId,
      imageUrl: wappenImageUrlById.get(wappenId),
    });
    if (!src) {
      continue;
    }
    const layerZIndex = w.zindex ?? nextLayerZIndex;
    const pos = apiPointToLayerPosition(
      resolveApiCoord(w.xpoint, POUCH_EDIT_DEFAULT_X),
      resolveApiCoord(w.ypoint, POUCH_EDIT_DEFAULT_Y),
      POUCH_EDIT_CANVAS_RECT,
      w.size,
    );
    restoredLayers.push({
      id: createCanvasLayerId(),
      kind: 'wappen',
      src,
      wappenId,
      zIndex: layerZIndex,
      rotation: w.rotationAngle ?? 0,
      ...pos,
    });
    nextLayerZIndex = Math.max(nextLayerZIndex, layerZIndex) + 1;
  }

  return {
    selectedOrder,
    itemMemos: memos,
    layers: ensureUniqueCanvasLayerIds(restoredLayers),
    nextZIndex: nextLayerZIndex,
  };
};

type PouchItemsPickerProps = {
  pouchId: string;
  pouchName: string;
};

export function PouchItemsPicker({
  pouchId,
  pouchName,
}: PouchItemsPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isEditMode = searchParams.get('mode') === 'edit';
  const isResume = searchParams.get('resume') === '1';
  const isFresh = searchParams.get('fresh') === '1';

  const numericPouchId = Number.parseInt(pouchId, 10);
  const hasNumericPouchId =
    Number.isFinite(numericPouchId) && numericPouchId > 0;

  const [step, setStep] = useState<PickerStep>('select');
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [itemMemos, setItemMemos] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isRegisterMenuOpen, setIsRegisterMenuOpen] = useState(false);
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(1);
  const [isDraftReady, setIsDraftReady] = useState(() => isEditMode || hasNumericPouchId);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [openSwipeRowId, setOpenSwipeRowId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [cacheRestorePayload, setCacheRestorePayload] =
    useState<EditRestorePayload | null>(null);
  const hasUserEditedCanvasRef = useRef(false);
  const hasAppliedEditSelectionPreloadRef = useRef(false);
  const hasAppliedLayerRestoreRef = useRef(false);
  const pendingScaleSourceRectRef = useRef<CanvasRect | null>(null);
  const canvasExportRef = useRef<HTMLDivElement | null>(null);

  const isDraftFlow = !isEditMode && !hasNumericPouchId;
  const isExistingPouchFlow = hasNumericPouchId && !isDraftFlow;
  const isPouchRestoreFlow = isEditMode || isExistingPouchFlow;

  useEffect(() => {
    queueMicrotask(() => {
      if (!isPouchRestoreFlow || !hasNumericPouchId) {
        setCacheRestorePayload(null);
        return;
      }
      const cached = readPouchCanvasState(numericPouchId);
      if (cached == null || (cached.layers.length ?? 0) === 0) {
        setCacheRestorePayload(null);
        return;
      }
      setCacheRestorePayload(buildEditRestorePayloadFromCache(cached));
    });
  }, [hasNumericPouchId, isPouchRestoreFlow, numericPouchId]);

  const getCanvasExportElement = useCallback((): HTMLElement | null => {
    return (
      canvasExportRef.current ??
      document.getElementById(POUCH_CANVAS_EXPORT_ID)
    );
  }, []);

  const { data, isLoading } = useSearchMyCosmetics({
    size: POUCH_COSMETIC_SEARCH_SIZE,
    sort: 'desc',
  });

  const items = useMemo(
    () => data?.result?.content ?? [],
    [data?.result?.content],
  );

  const needsLayerRestore =
    isPouchRestoreFlow && hasNumericPouchId && step === 'decorate';

  const needsPouchCosmeticLookup =
    isPouchRestoreFlow && hasNumericPouchId;

  const { data: pouchDetailData, isLoading: isPouchDetailLoading } =
    useGetPouchDetail(numericPouchId, {
      query: { enabled: needsPouchCosmeticLookup },
    });

  const pouchDetailCosmetics = pouchDetailData?.result?.cosmetics;
  const {
    cosmeticsById: editCosmeticsById,
    cosmeticsByNameBrand: editCosmeticsByNameBrand,
    isLoading: isEditCosmeticsLookupLoading,
  } = usePouchCosmeticsById(
    needsPouchCosmeticLookup ? pouchDetailCosmetics : undefined,
    {
      listItems: items,
    },
  );

  const validCosmeticIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of items) {
      if (item.id != null && item.id > 0) {
        ids.add(item.id);
      }
    }
    return ids;
  }, [items]);

  const [isSelectionRestoreApplied, setIsSelectionRestoreApplied] = useState(
    () => !isPouchRestoreFlow || !hasNumericPouchId,
  );

  const { data: pouchListData } = useQuery({
    queryKey: getPouchListQueryKey(),
    queryFn: fetchPouchList,
    enabled:
      isPouchRestoreFlow && hasNumericPouchId && step === 'select',
    staleTime: 60_000,
  });

  const editPouchImageUrl = useMemo(() => {
    if (!isPouchRestoreFlow || !hasNumericPouchId) {
      return null;
    }
    const pouch = pouchListData?.result?.pouchList?.find(
      (entry) => entry.pouchId === numericPouchId,
    );
    const url = pouch?.imageUrl?.trim();
    return url || null;
  }, [
    hasNumericPouchId,
    isPouchRestoreFlow,
    numericPouchId,
    pouchListData?.result?.pouchList,
  ]);

  const editPouchPreviewSrc = useMemo(() => {
    if (!editPouchImageUrl) {
      return null;
    }
    return resolveDisplayImageSrc(resolveMediaUrl(editPouchImageUrl));
  }, [editPouchImageUrl]);

  const {
    data: wappenListData,
    isFetched: isWappenListFetched,
    isError: isWappenListError,
  } = useGetWappenList(
    { pageable: { page: 0, size: 100 } },
    { query: { enabled: needsLayerRestore } },
  );

  const wappenImageUrlById = useMemo(() => {
    const map = new Map<number, string>();
    for (const wappen of wappenListData?.result?.wappens ?? []) {
      const wappenId = wappen.wappenId;
      const imageUrl = wappen.imageUrl?.trim();
      if (wappenId != null && imageUrl) {
        map.set(wappenId, imageUrl);
      }
    }
    return map;
  }, [wappenListData?.result?.wappens]);

  const decorateCosmeticItems = useMemo(() => {
    if (selectedOrder.length === 0) {
      return [];
    }
    const itemsById = new Map<number, MyCosmeticsResponseDTO>();
    for (const item of items) {
      if (item.id != null) {
        itemsById.set(item.id, item);
      }
    }
    return selectedOrder
      .map((id) => itemsById.get(id))
      .filter((item): item is MyCosmeticsResponseDTO => item != null);
  }, [items, selectedOrder]);

  const warmItems = useMemo(() => {
    if (step === 'decorate' && decorateCosmeticItems.length > 0) {
      return decorateCosmeticItems;
    }
    if (selectedOrder.length > 0) {
      const itemsById = new Map<number, MyCosmeticsResponseDTO>();
      for (const item of items) {
        if (item.id != null) {
          itemsById.set(item.id, item);
        }
      }
      return selectedOrder
        .map((id) => itemsById.get(id))
        .filter((item): item is MyCosmeticsResponseDTO => item != null);
    }
    return items.slice(0, 48);
  }, [decorateCosmeticItems, items, selectedOrder, step]);

  useWarmMyCosmeticsItems(warmItems);

  const displayName = pouchName.trim() || readPendingPouchName() || '새 파우치';
  const pouchItemsPath = buildPouchItemsPath(pouchId, displayName);

  const isCosmeticsEmpty = !isLoading && items.length === 0;

  const applyDraft = useCallback((draft: PouchDraftState) => {
    setStep(draft.step);
    setSelectedOrder(draft.selectedOrder);
    setItemMemos(draft.itemMemos);
    setLayers(ensureUniqueCanvasLayerIds(draft.layers));
    setNextZIndex(draft.nextZIndex);
    setSelectedLayerId(null);
  }, []);

  const resetDraftState = useCallback(() => {
    setStep('select');
    setSelectedOrder([]);
    setItemMemos({});
    setLayers([]);
    setNextZIndex(1);
    setSelectedLayerId(null);
    setIsSheetExpanded(false);
  }, []);

  useEffect(() => {
    if (!isDraftFlow) {
      return;
    }
    if (isFresh || !isResume) {
      clearPendingPouchId();
    }
  }, [isDraftFlow, isFresh, isResume]);

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage 드래프트는 마운트 후 판별 */
  useEffect(() => {
    if (!isDraftFlow) {
      return;
    }

    const draft = readPouchDraft();
    if (!draft) {
      setIsDraftReady(true);
      return;
    }

    if (isResume) {
      applyDraft(draft);
      setIsDraftReady(true);
      return;
    }

    if (isFresh) {
      setIsDraftReady(true);
      return;
    }

    if (hasPouchDraftForItemsResume()) {
      setIsDraftModalOpen(true);
      return;
    }

    setIsDraftReady(true);
  }, [applyDraft, isDraftFlow, isFresh, isResume]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const draftSnapshot = useMemo(
    () => ({
      pouchName: displayName,
      step,
      selectedOrder,
      itemMemos,
      layers,
      nextZIndex,
    }),
    [displayName, itemMemos, layers, nextZIndex, selectedOrder, step],
  );
  const debouncedDraftSnapshot = useDebounce(draftSnapshot, 300);

  useEffect(() => {
    if (!isDraftFlow || !isDraftReady || isDraftModalOpen) {
      return;
    }

    savePouchDraft(debouncedDraftSnapshot);
  }, [debouncedDraftSnapshot, isDraftFlow, isDraftModalOpen, isDraftReady]);

  const handleStartFreshDraft = () => {
    clearPouchDraft();
    resetDraftState();
    setIsDraftModalOpen(false);
    setIsDraftReady(true);
  };

  const handleResumeDraft = () => {
    const draft = readPouchDraft();
    if (draft) {
      applyDraft(draft);
    }
    setIsDraftModalOpen(false);
    setIsDraftReady(true);
  };

  const editLayerRestorePayload = useMemo(() => {
    if (!needsLayerRestore) {
      return null;
    }

    const detail = pouchDetailData?.result;
    const hasWappensToRestore = (detail?.wappens?.length ?? 0) > 0;
    const isWappenGatePending =
      hasWappensToRestore && !isWappenListFetched && !isWappenListError;

    if (
      !detail ||
      isPouchDetailLoading ||
      isEditCosmeticsLookupLoading ||
      isWappenGatePending
    ) {
      return cacheRestorePayload;
    }

    const apiPayload = buildEditRestorePayload(
      detail,
      editCosmeticsById,
      editCosmeticsByNameBrand,
      wappenImageUrlById,
    );

    if (apiPayload.layers.length > 0) {
      return mergeEditRestorePayload(apiPayload, cacheRestorePayload);
    }

    return cacheRestorePayload ?? EMPTY_EDIT_RESTORE_PAYLOAD;
  }, [
    cacheRestorePayload,
    editCosmeticsById,
    editCosmeticsByNameBrand,
    isEditCosmeticsLookupLoading,
    isPouchDetailLoading,
    isWappenListError,
    isWappenListFetched,
    needsLayerRestore,
    pouchDetailData?.result,
    wappenImageUrlById,
  ]);

  const isEditRestoreReady =
    !isPouchRestoreFlow ||
    (isSelectionRestoreApplied &&
      !isLoading &&
      !isPouchDetailLoading &&
      !isEditCosmeticsLookupLoading);

  const isBlockingLoad = (isDraftFlow && !isDraftReady) || isLoading;

  const applyEditRestoreToState = useCallback(
    (payload: EditRestorePayload) => {
      setSelectedOrder(
        sanitizeSelectedOrder(payload.selectedOrder, validCosmeticIds),
      );
      setItemMemos(payload.itemMemos);
      setNextZIndex(payload.nextZIndex);
      setLayers(ensureUniqueCanvasLayerIds(payload.layers));
      pendingScaleSourceRectRef.current = payload.sourceCanvasRect ?? null;
    },
    [validCosmeticIds],
  );

  useEffect(() => {
    if (!isPouchRestoreFlow || hasUserEditedCanvasRef.current) {
      return;
    }
    if (hasAppliedEditSelectionPreloadRef.current) {
      return;
    }
    const detail = pouchDetailData?.result;
    if (
      !detail ||
      isPouchDetailLoading ||
      isEditCosmeticsLookupLoading ||
      isLoading
    ) {
      return;
    }

    const fromDetail = buildSelectionRestoreFromPouchDetailWithLookup(
      detail,
      editCosmeticsById,
      editCosmeticsByNameBrand,
    );
    const rawSelectionOrder =
      fromDetail.selectedOrder.length > 0
        ? fromDetail.selectedOrder
        : (cacheRestorePayload?.selectedOrder ?? []);
    const selectionOrder = sanitizeSelectedOrder(
      rawSelectionOrder,
      validCosmeticIds,
    );
    const memos = {
      ...(cacheRestorePayload?.itemMemos ?? {}),
      ...fromDetail.itemMemos,
    };

    hasAppliedEditSelectionPreloadRef.current = true;

    queueMicrotask(() => {
      if (selectionOrder.length > 0) {
        setSelectedOrder(selectionOrder);
      }
      if (Object.keys(memos).length > 0) {
        setItemMemos(memos);
      }
      if (cacheRestorePayload?.nextZIndex != null) {
        setNextZIndex(cacheRestorePayload.nextZIndex);
      }
      setIsSelectionRestoreApplied(true);
    });
  }, [
    cacheRestorePayload,
    editCosmeticsById,
    editCosmeticsByNameBrand,
    isEditCosmeticsLookupLoading,
    isLoading,
    isPouchDetailLoading,
    isPouchRestoreFlow,
    pouchDetailData?.result,
    validCosmeticIds,
  ]);

  useEffect(() => {
    if (step !== 'decorate' || !isPouchRestoreFlow || hasUserEditedCanvasRef.current) {
      return;
    }
    if (!editLayerRestorePayload || hasAppliedLayerRestoreRef.current) {
      return;
    }

    hasAppliedLayerRestoreRef.current = true;
    const payload = filterRestorePayloadForSelection(
      editLayerRestorePayload,
      selectedOrder,
      validCosmeticIds,
    );
    queueMicrotask(() => {
      applyEditRestoreToState(payload);
    });
  }, [
    applyEditRestoreToState,
    editLayerRestorePayload,
    isPouchRestoreFlow,
    selectedOrder,
    step,
    validCosmeticIds,
  ]);

  useLayoutEffect(() => {
    if (step !== 'decorate') {
      return;
    }
    const fromRect = pendingScaleSourceRectRef.current;
    if (!fromRect) {
      return;
    }
    const canvasEl = getCanvasExportElement();
    const targetRect = getCanvasRectFromElement(canvasEl);
    pendingScaleSourceRectRef.current = null;
    setLayers((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      return ensureUniqueCanvasLayerIds(
        scaleLayersToCanvasRect(prev, fromRect, targetRect),
      );
    });
  }, [getCanvasExportElement, step]);

  const handleLayersChange = useCallback((nextLayers: CanvasLayer[]) => {
    hasUserEditedCanvasRef.current = true;
    setLayers(nextLayers);
    setSelectedOrder((prev) => {
      const cosmeticIdsOnCanvas = new Set(
        nextLayers
          .filter(
            (layer) => layer.kind === 'cosmetic' && layer.myCosmeticId != null,
          )
          .map((layer) => layer.myCosmeticId as number),
      );
      return prev.filter((id) => cosmeticIdsOnCanvas.has(id));
    });
  }, []);

  const handleNavigateToScanRegister = () => {
    savePouchRegisterReturnPath(pouchItemsPath);
    router.push('/my-cosmetics/register');
  };

  const handleNavigateToDirectRegister = () => {
    savePouchRegisterReturnPath(pouchItemsPath);
    router.push('/my-cosmetics/register/direct');
  };

  const handleToggleItem = (id: number) => {
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
    setSelectedOrder((prev) => {
      if (prev.includes(id)) {
        return prev.filter((itemId) => itemId !== id);
      }
      return [...prev, id];
    });
    setItemMemos((prev) => {
      if (!(id in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleMemoChange = (id: number, memo: string) => {
    setItemMemos((prev) => ({
      ...prev,
      [id]: memo,
    }));
  };

  const pouchReturnPath = useMemo(() => {
    const query = searchParams.toString();
    if (!query) {
      return pathname;
    }
    return `${pathname}?${query}`;
  }, [pathname, searchParams]);

  const handleEditItem = useCallback(
    (id: number) => {
      const params = new URLSearchParams();
      params.set('edit', '1');
      params.set('returnTo', pouchReturnPath);
      router.push(`/my-cosmetics/${id}?${params.toString()}`);
    },
    [pouchReturnPath, router],
  );

  const { mutateAsync: removeMyCosmetic, isPending: isDeletePending } =
    useMutation({
      mutationFn: (myCosmeticsIds: number[]) =>
        deleteMyCosmeticsItems(myCosmeticsIds),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSearchMyCosmeticsQueryKey({
            size: POUCH_COSMETIC_SEARCH_SIZE,
            sort: 'desc',
          }),
        });
      },
    });

  const handleDeleteItemRequest = useCallback((id: number) => {
    setOpenSwipeRowId(null);
    setDeleteConfirmId(id);
  }, []);

  const handleConfirmDeleteItem = useCallback(async () => {
    if (deleteConfirmId == null || isDeletePending) {
      return;
    }

    try {
      await removeMyCosmetic([deleteConfirmId]);
      setSelectedOrder((prev) =>
        prev.filter((itemId) => itemId !== deleteConfirmId),
      );
      setItemMemos((prev) => {
        if (!(deleteConfirmId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[deleteConfirmId];
        return next;
      });
      setDeleteConfirmId(null);
    } catch {
      alert('삭제하지 못했습니다. 다시 시도해 주세요.');
    }
  }, [deleteConfirmId, isDeletePending, removeMyCosmetic]);

  const handleNextSelect = () => {
    if (selectedOrder.length === 0) {
      alert('파우치에 넣을 화장품을 선택해 주세요.');
      return;
    }
    setStep('decorate');
    setIsSheetExpanded(false);
  };

  const addLayer = useCallback((layer: CanvasLayer) => {
    hasUserEditedCanvasRef.current = true;
    setLayers((prev) => [...prev, layer]);
    setNextZIndex((z) => z + 1);
    setSelectedLayerId(layer.id);
  }, []);

  const handleAddCosmetic = (item: MyCosmeticsResponseDTO) => {
    const id = item.id;
    if (id == null) {
      return;
    }
    const src = getCosmeticImageSrc(item);
    if (!src) {
      return;
    }
    setSelectedOrder((prev) => {
      if (prev.includes(id)) {
        return prev;
      }
      return [...prev, id];
    });
    const canvasEl = getCanvasExportElement();
    const canvasRect = getCanvasRectFromElement(canvasEl);
    addLayer(
      createCenteredLayer('cosmetic', src, canvasRect, {
        myCosmeticId: id,
        zIndex: nextZIndex,
      }),
    );
  };

  const handleAddWappen = (wappen: { wappenId: number; imageUrl: string }) => {
    const src = wappen.imageUrl.trim();
    if (!src) {
      return;
    }
    const canvasEl = getCanvasExportElement();
    const canvasRect = getCanvasRectFromElement(canvasEl);
    addLayer(
      createCenteredLayer('wappen', src, canvasRect, {
        wappenId: wappen.wappenId,
        zIndex: nextZIndex,
      }),
    );
  };

  const handleComplete = async () => {
    if (selectedOrder.length === 0) {
      alert('파우치에 넣을 화장품을 선택해 주세요.');
      return;
    }

    const canvasEl = getCanvasExportElement();
    if (!canvasEl) {
      alert('파우치 미리보기를 찾지 못했습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const canvasRect = getCanvasRectFromElement(canvasEl);
      const validSelectedIds = sanitizeSelectedOrder(
        selectedOrder,
        validCosmeticIds,
      );
      const selections = validSelectedIds.map((myCosmeticId) => {
        const memo = itemMemos[myCosmeticId]?.trim();
        return {
          myCosmeticId,
          ...(memo ? { memo } : {}),
        };
      });

      flushSync(() => {
        setSelectedLayerId(null);
      });
      const compositeBlob = await exportPouchCanvas(canvasEl);

      const savedPouchId = await savePouchDecoration(
        pouchId,
        displayName,
        selections,
        layers,
        canvasRect,
        compositeBlob,
      );

      clearPouchSetupSession();
      await queryClient.invalidateQueries({
        queryKey: getPouchListQueryKey(),
      });
      await queryClient.invalidateQueries({
        queryKey: getSearchMyCosmeticsQueryKey({
          size: POUCH_COSMETIC_SEARCH_SIZE,
          sort: 'desc',
        }),
      });

      if (isPouchRestoreFlow) {
        router.replace('/my-cosmetics');
      } else {
        router.replace(buildPouchCompletePath(savedPouchId, displayName));
      }
    } catch (err) {
      alert(getPouchSaveErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const sheetSnapRatio = isSheetExpanded
    ? POUCH_ITEMS_SHEET_SNAP_EXPANDED
    : POUCH_ITEMS_SHEET_SNAP_COLLAPSED;
  const sheetReservedBottom = `calc(var(--app-height) * ${sheetSnapRatio} + ${POUCH_ITEMS_SHEET_TOGGLE_RESERVE} + ${POUCH_ITEMS_SHEET_BOTTOM_OFFSET})`;

  const headerAction =
    step === 'select' ? (
      <PouchNextButton
        isDisabled={
          selectedOrder.length === 0 ||
          (isPouchRestoreFlow && !isEditRestoreReady)
        }
        isLoading={isPouchRestoreFlow && !isEditRestoreReady}
        onClick={handleNextSelect}
      />
    ) : (
      <PouchNextButton
        label="완료"
        isDisabled={isSaving}
        isLoading={isSaving}
        onClick={handleComplete}
      />
    );

  return (
    <div className="relative flex h-(--app-height) w-full flex-col overflow-hidden bg-white">
      <PouchDraftResumeModal
        open={isDraftModalOpen}
        onStartFresh={handleStartFreshDraft}
        onResume={handleResumeDraft}
      />
      <Header
        title={displayName}
        onBack={() => {
          if (step === 'decorate') {
            setStep('select');
            return;
          }
          if (isEditMode || hasNumericPouchId) {
            router.push('/my-cosmetics');
            return;
          }
          router.push('/my-cosmetics/create');
        }}
        className="shrink-0 border-b border-zinc-100 pt-[var(--safe-area-top)]"
        right={isBlockingLoad ? undefined : headerAction}
      />

      {isBlockingLoad && !isDraftModalOpen ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-zinc-500">
          불러오는 중...
        </div>
      ) : (
        <>
      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        <div
          className="flex min-h-0 flex-1 items-center justify-center px-4 pt-2"
          style={{ paddingBottom: sheetReservedBottom }}
        >
          {step === 'decorate' ? (
            <PouchDecorateCanvas
              ref={canvasExportRef}
              layers={layers}
              onLayersChange={handleLayersChange}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
            />
          ) : (
            <div className="flex h-full w-full max-w-[320px] items-center justify-center">
              {editPouchPreviewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editPouchPreviewSrc}
                  alt={displayName}
                  className="h-auto max-h-full w-auto max-w-full object-contain"
                />
              ) : (
                <Image
                  src={POUCHY_SRC}
                  alt=""
                  width={320}
                  height={460}
                  unoptimized
                  className="h-auto max-h-full w-auto max-w-full object-contain"
                  priority
                />
              )}
            </div>
          )}
        </div>

        {step === 'select' ? (
          <PouchItemsBottomSheet
            items={items}
            isLoading={isLoading}
            selectedOrder={selectedOrder}
            itemMemos={itemMemos}
            isExpanded={isSheetExpanded}
            onExpandedChange={setIsSheetExpanded}
            onToggleItem={handleToggleItem}
            onMemoChange={handleMemoChange}
            openSwipeRowId={openSwipeRowId}
            onOpenSwipeRowIdChange={setOpenSwipeRowId}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItemRequest}
          />
        ) : (
          <PouchDecorateBottomSheet
            cosmeticItems={decorateCosmeticItems}
            isCosmeticsLoading={isLoading}
            isExpanded={isSheetExpanded}
            onExpandedChange={setIsSheetExpanded}
            onAddCosmetic={handleAddCosmetic}
            onAddWappen={handleAddWappen}
          />
        )}
      </div>

      {step === 'select' ? (
        <div className="pointer-events-none fixed bottom-16 left-1/2 z-50 w-full max-w-120 -translate-x-1/2">
          <div
            className={cn(
              'relative pr-5',
              isCosmeticsEmpty ? 'h-[168px]' : 'h-24',
            )}
          >
            {isCosmeticsEmpty ? (
              <div
                className={cn(
                  'pointer-events-none absolute right-7 bottom-[70px] w-[156px]',
                  'transition-[opacity,filter] duration-200',
                  isRegisterMenuOpen && 'opacity-40 grayscale',
                )}
              >
                <Image
                  src={SPEECH_BUBBLE_SRC}
                  alt=""
                  width={200}
                  height={150}
                  unoptimized
                  className="block h-auto w-full"
                  priority
                />
              </div>
            ) : null}
            <div className="pointer-events-auto absolute right-5 bottom-5">
              <ExtraNav
                dimBackdrop
                onOpenChange={setIsRegisterMenuOpen}
                items={[
                  {
                    label: '스캔하여 등록하기',
                    onClick: handleNavigateToScanRegister,
                    icon: '/icons/imgplus.svg',
                  },
                  {
                    label: '직접 등록하기',
                    onClick: handleNavigateToDirectRegister,
                    icon: '/icons/write.svg',
                  },
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}
        </>
      )}

      <Modal
        open={deleteConfirmId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmId(null);
          }
        }}
        variant="warning"
        title="이 화장품을 삭제할까요?"
        description="삭제한 항목은 복구할 수 없어요."
        showCancel
        confirmText={isDeletePending ? '삭제 중...' : '삭제하기'}
        onConfirm={() => {
          void handleConfirmDeleteItem();
        }}
      />
    </div>
  );
}

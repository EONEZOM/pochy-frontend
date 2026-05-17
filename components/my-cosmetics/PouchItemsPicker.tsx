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
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useSearchMyCosmetics } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { getSearchMyCosmeticsQueryKey } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { useGetPouchDetail } from '@/api/generated/pouch-controller/pouch-controller';
import { useGetWappenList } from '@/api/generated/wappen-controller/wappen-controller';
import { ExtraNav } from '@/components/common/ExtraNav';
import { Header } from '@/components/layout/Header';
import {
  POUCH_ITEMS_SHEET_SNAP_COLLAPSED,
  POUCH_ITEMS_SHEET_SNAP_EXPANDED,
  POUCH_ITEMS_SHEET_BOTTOM_OFFSET,
  POUCH_ITEMS_SHEET_TOGGLE_RESERVE,
  PouchItemsBottomSheet,
} from '@/components/my-cosmetics/PouchItemsBottomSheet';
import { PouchDecorateBottomSheet } from '@/components/my-cosmetics/PouchDecorateBottomSheet';
import { PouchDecorateCanvas } from '@/components/my-cosmetics/PouchDecorateCanvas';
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
  resolvePouchRowCosmeticMatch,
  usePouchCosmeticsById,
} from '@/lib/pouch-cosmetic-lookup';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { cn } from '@/lib/utils';
import type { MyCosmeticsResponseDTO, PouchDetailDto } from '@/api/model';

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
): EditRestorePayload => {
  const selected = new Set(currentSelectedOrder);
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
    selectedOrder: currentSelectedOrder,
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

  for (const c of detail.cosmetics ?? []) {
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
    );
    restoredLayers.push({
      id: createCanvasLayerId(),
      kind: 'cosmetic',
      src,
      myCosmeticId: linkId,
      zIndex: layerZIndex,
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
    );
    restoredLayers.push({
      id: createCanvasLayerId(),
      kind: 'wappen',
      src,
      wappenId,
      zIndex: layerZIndex,
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
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [cacheRestorePayload, setCacheRestorePayload] =
    useState<EditRestorePayload | null>(null);
  const hasUserEditedCanvasRef = useRef(false);
  const hasAppliedEditSelectionPreloadRef = useRef(false);
  const pendingScaleSourceRectRef = useRef<CanvasRect | null>(null);
  const canvasExportRef = useRef<HTMLDivElement | null>(null);

  const isDraftFlow = !isEditMode && !hasNumericPouchId;

  useEffect(() => {
    queueMicrotask(() => {
      setIsClientMounted(true);
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (!isEditMode || !hasNumericPouchId) {
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
  }, [hasNumericPouchId, isEditMode, numericPouchId]);

  const getCanvasExportElement = useCallback((): HTMLElement | null => {
    return (
      canvasExportRef.current ??
      document.getElementById(POUCH_CANVAS_EXPORT_ID)
    );
  }, []);

  const { data, isLoading } = useSearchMyCosmetics({
    size: 100,
    sort: 'desc',
  });

  const { data: pouchDetailData, isLoading: isPouchDetailLoading } =
    useGetPouchDetail(numericPouchId, {
      query: { enabled: isEditMode && hasNumericPouchId },
    });

  const pouchDetailCosmetics = pouchDetailData?.result?.cosmetics;
  const {
    cosmeticsById: editCosmeticsById,
    cosmeticsByNameBrand: editCosmeticsByNameBrand,
    isLoading: isEditCosmeticsLookupLoading,
  } = usePouchCosmeticsById(isEditMode ? pouchDetailCosmetics : undefined);

  const { data: pouchListData } = useQuery({
    queryKey: getPouchListQueryKey(),
    queryFn: fetchPouchList,
    enabled: isEditMode && hasNumericPouchId,
  });

  const editPouchImageUrl = useMemo(() => {
    if (!isEditMode || !hasNumericPouchId) {
      return null;
    }
    const pouch = pouchListData?.result?.pouchList?.find(
      (entry) => entry.pouchId === numericPouchId,
    );
    const url = pouch?.imageUrl?.trim();
    return url || null;
  }, [
    hasNumericPouchId,
    isEditMode,
    numericPouchId,
    pouchListData?.result?.pouchList,
  ]);

  const editPouchPreviewSrc = useMemo(() => {
    if (!editPouchImageUrl) {
      return null;
    }
    return resolveDisplayImageSrc(resolveMediaUrl(editPouchImageUrl));
  }, [editPouchImageUrl]);

  const { data: wappenListData, isSuccess: isWappenListReady } =
    useGetWappenList(
      { pageable: { page: 0, size: 100 } },
      { query: { enabled: isEditMode } },
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

  const items = useMemo(
    () => data?.result?.content ?? [],
    [data?.result?.content],
  );

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

  useEffect(() => {
    if (!isDraftFlow || !isDraftReady || isDraftModalOpen) {
      return;
    }

    savePouchDraft({
      pouchName: displayName,
      step,
      selectedOrder,
      itemMemos,
      layers,
      nextZIndex,
    });
  }, [
    displayName,
    isDraftFlow,
    isDraftModalOpen,
    isDraftReady,
    itemMemos,
    layers,
    nextZIndex,
    selectedOrder,
    step,
  ]);

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

  const editRestorePayload = useMemo(() => {
    if (!isEditMode || !hasNumericPouchId) {
      return null;
    }

    const detail = pouchDetailData?.result;
    if (!detail || isPouchDetailLoading || isEditCosmeticsLookupLoading) {
      return cacheRestorePayload;
    }
    const hasWappensToRestore = (detail.wappens?.length ?? 0) > 0;
    if (hasWappensToRestore && !isWappenListReady) {
      return cacheRestorePayload;
    }

    const apiPayload = buildEditRestorePayload(
      detail,
      editCosmeticsById,
      editCosmeticsByNameBrand,
      wappenImageUrlById,
    );

    if (apiPayload.layers.length > 0 || apiPayload.selectedOrder.length > 0) {
      return mergeEditRestorePayload(apiPayload, cacheRestorePayload);
    }

    return cacheRestorePayload;
  }, [
    cacheRestorePayload,
    editCosmeticsById,
    editCosmeticsByNameBrand,
    hasNumericPouchId,
    isEditCosmeticsLookupLoading,
    isEditMode,
    isPouchDetailLoading,
    isWappenListReady,
    pouchDetailData?.result,
    wappenImageUrlById,
  ]);

  const isEditRestoreReady = !isEditMode || editRestorePayload != null;

  const isEditRestoreLoading =
    isClientMounted &&
    isEditMode &&
    hasNumericPouchId &&
    editRestorePayload == null &&
    (isPouchDetailLoading ||
      isEditCosmeticsLookupLoading ||
      ((pouchDetailData?.result?.wappens?.length ?? 0) > 0 &&
        !isWappenListReady));

  const isBlockingLoad = (isDraftFlow && !isDraftReady) || isEditRestoreLoading;

  const applyEditRestoreToState = useCallback((payload: EditRestorePayload) => {
    setSelectedOrder(payload.selectedOrder);
    setItemMemos(payload.itemMemos);
    setNextZIndex(payload.nextZIndex);
    setLayers(ensureUniqueCanvasLayerIds(payload.layers));
    pendingScaleSourceRectRef.current = payload.sourceCanvasRect ?? null;
  }, []);

  useEffect(() => {
    if (!isEditMode || !editRestorePayload || hasUserEditedCanvasRef.current) {
      return;
    }
    if (hasAppliedEditSelectionPreloadRef.current) {
      return;
    }
    hasAppliedEditSelectionPreloadRef.current = true;
    queueMicrotask(() => {
      setSelectedOrder(editRestorePayload.selectedOrder);
      setItemMemos(editRestorePayload.itemMemos);
      setNextZIndex(editRestorePayload.nextZIndex);
    });
  }, [editRestorePayload, isEditMode]);

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

  const handleNextSelect = () => {
    if (selectedOrder.length === 0) {
      alert('파우치에 넣을 화장품을 선택해 주세요.');
      return;
    }
    if (isEditMode && editRestorePayload && !hasUserEditedCanvasRef.current) {
      const payload = filterRestorePayloadForSelection(
        editRestorePayload,
        selectedOrder,
      );
      applyEditRestoreToState(payload);
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
      const validSelectedIds = selectedOrder.filter(
        (id) => Number.isFinite(id) && id > 0,
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
        queryKey: getSearchMyCosmeticsQueryKey({ size: 100, sort: 'desc' }),
      });

      if (isEditMode) {
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
          selectedOrder.length === 0 || (isEditMode && !isEditRestoreReady)
        }
        isLoading={isEditMode && !isEditRestoreReady}
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
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  type CanvasLayer,
} from '@/lib/pouch-canvas';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { cn } from '@/lib/utils';
import type { MyCosmeticsResponseDTO } from '@/api/model';

const POUCHY_SRC = '/figma/my/pouchy.svg';
const SPEECH_BUBBLE_SRC = '/figma/my/말풍선.svg';

type PickerStep = 'select' | 'decorate';

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
  const [hasInitializedEdit, setHasInitializedEdit] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

  const isDraftFlow = !isEditMode && !hasNumericPouchId;

  const { data, isLoading } = useSearchMyCosmetics({
    size: 100,
    sort: 'desc',
  });

  const { data: pouchDetailData } = useGetPouchDetail(numericPouchId, {
    query: { enabled: isEditMode && hasNumericPouchId },
  });

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

  const itemsById = useMemo(() => {
    const map = new Map<number, MyCosmeticsResponseDTO>();
    for (const item of items) {
      if (item.id != null) {
        map.set(item.id, item);
      }
    }
    return map;
  }, [items]);

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
      setIsDraftReady(true);
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

  useEffect(() => {
    if (!isEditMode || !hasNumericPouchId || hasInitializedEdit) {
      return;
    }
    const detail = pouchDetailData?.result;
    if (!detail) {
      return;
    }

    if (isLoading) {
      return;
    }

    const hasWappensToRestore = (detail.wappens?.length ?? 0) > 0;
    if (hasWappensToRestore && !isWappenListReady) {
      return;
    }

    const cosmeticIds =
      detail.cosmetics
        ?.map((c) => c.myCosmeticId)
        .filter((id): id is number => typeof id === 'number' && id > 0) ?? [];

    const memos: Record<number, string> = {};
    for (const c of detail.cosmetics ?? []) {
      if (c.myCosmeticId != null && c.memo?.trim()) {
        memos[c.myCosmeticId] = c.memo;
      }
    }

    const canvasRect = {
      width: 320,
      height: 460,
    };

    const restoredLayers: CanvasLayer[] = [];
    let nextLayerZIndex = 1;

    for (const c of detail.cosmetics ?? []) {
      const myCosmeticId = c.myCosmeticId;
      if (myCosmeticId == null) {
        continue;
      }
      const item = itemsById.get(myCosmeticId);
      const src = item ? getCosmeticImageSrc(item) : '';
      if (!src) {
        continue;
      }
      const layerZIndex = c.zindex ?? nextLayerZIndex;
      const pos = apiPointToLayerPosition(
        c.xpoint ?? 160,
        c.ypoint ?? 230,
        canvasRect,
      );
      restoredLayers.push({
        id: createCanvasLayerId(),
        kind: 'cosmetic',
        src,
        myCosmeticId,
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
      const layerZIndex = w.zindex ?? nextLayerZIndex;
      const pos = apiPointToLayerPosition(
        w.xpoint ?? 160,
        w.ypoint ?? 230,
        canvasRect,
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

    setHasInitializedEdit(true);
    setSelectedOrder(cosmeticIds);
    setItemMemos(memos);
    setLayers(ensureUniqueCanvasLayerIds(restoredLayers));
    setNextZIndex(nextLayerZIndex);
  }, [
    isEditMode,
    hasNumericPouchId,
    hasInitializedEdit,
    pouchDetailData?.result,
    itemsById,
    isLoading,
    isWappenListReady,
    wappenImageUrlById,
  ]);

  const handleLayersChange = useCallback((nextLayers: CanvasLayer[]) => {
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
    setStep('decorate');
    setIsSheetExpanded(false);
  };

  const addLayer = useCallback((layer: CanvasLayer) => {
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
    const canvasEl = document.getElementById(POUCH_CANVAS_EXPORT_ID);
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
    const canvasEl = document.getElementById(POUCH_CANVAS_EXPORT_ID);
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

    const canvasEl = document.getElementById(POUCH_CANVAS_EXPORT_ID);
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

  if (isDraftFlow && !isDraftReady) {
    return (
      <>
        <PouchDraftResumeModal
          open={isDraftModalOpen}
          onStartFresh={handleStartFreshDraft}
          onResume={handleResumeDraft}
        />
        {!isDraftModalOpen ? (
          <div className="flex h-(--app-height) items-center justify-center bg-white text-sm text-zinc-500">
            불러오는 중...
          </div>
        ) : null}
      </>
    );
  }

  const headerAction =
    step === 'select' ? (
      <PouchNextButton
        isDisabled={selectedOrder.length === 0}
        isLoading={false}
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
        right={headerAction}
      />

      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        <div
          className="flex min-h-0 flex-1 items-center justify-center px-4 pt-2"
          style={{ paddingBottom: sheetReservedBottom }}
        >
          {step === 'decorate' ? (
            <PouchDecorateCanvas
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
            cosmeticItems={items}
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
    </div>
  );
}

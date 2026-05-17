'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { useSearchMyCosmetics } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { getSearchMyCosmeticsQueryKey } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { useGetPouchDetail } from '@/api/generated/pouch-controller/pouch-controller';
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
import { PouchNextButton } from '@/components/my-cosmetics/PouchNextButton';
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
  createCenteredLayer,
  exportPouchCanvas,
  getCanvasRectFromElement,
  getCosmeticImageSrc,
  getWappenImageSrc,
  type CanvasLayer,
} from '@/lib/pouch-canvas';
import { cn } from '@/lib/utils';
import type { MyCosmeticsResponseDTO } from '@/api/model';

const POUCHY_SRC = '/figma/my/pouchy.svg';
const SPEECH_BUBBLE_SRC = '/figma/my/\uB9D0\uD48D\uC120.svg';

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

  const numericPouchId = Number.parseInt(pouchId, 10);
  const hasNumericPouchId =
    Number.isFinite(numericPouchId) && numericPouchId > 0;

  const [step, setStep] = useState<PickerStep>(
    isEditMode ? 'decorate' : 'select',
  );
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [itemMemos, setItemMemos] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isRegisterMenuOpen, setIsRegisterMenuOpen] = useState(false);
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(1);
  const [editBackgroundUrl, setEditBackgroundUrl] = useState<string | null>(
    null,
  );
  const [hasInitializedEdit, setHasInitializedEdit] = useState(false);

  const { data, isLoading } = useSearchMyCosmetics({
    size: 100,
    sort: 'desc',
  });

  const { data: pouchDetailData } = useGetPouchDetail(numericPouchId, {
    query: { enabled: isEditMode && hasNumericPouchId },
  });

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

  const displayName =
    pouchName.trim() || readPendingPouchName() || '\uC0C8 \uD30C\uC6B0\uCE58';
  const pouchItemsPath = buildPouchItemsPath(pouchId, displayName);

  const selectedItems = useMemo(() => {
    return selectedOrder
      .map((id) => itemsById.get(id))
      .filter((item): item is MyCosmeticsResponseDTO => item != null);
  }, [selectedOrder, itemsById]);

  const isCosmeticsEmpty = !isLoading && items.length === 0;

  useEffect(() => {
    if (!isEditMode || !hasNumericPouchId || hasInitializedEdit) {
      return;
    }
    const detail = pouchDetailData?.result;
    if (!detail) {
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
    let z = 1;

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
      const pos = apiPointToLayerPosition(
        c.xpoint ?? 160,
        c.ypoint ?? 230,
        canvasRect,
      );
      restoredLayers.push({
        id: `cosmetic-${myCosmeticId}-${z}`,
        kind: 'cosmetic',
        src,
        myCosmeticId,
        zIndex: c.zindex ?? z,
        ...pos,
      });
      z = Math.max(z, (c.zindex ?? z) + 1);
    }

    for (const w of detail.wappens ?? []) {
      const wappenId = w.wappenId;
      if (wappenId == null) {
        continue;
      }
      const src = getWappenImageSrc({ wappenId });
      const pos = apiPointToLayerPosition(
        w.xpoint ?? 160,
        w.ypoint ?? 230,
        canvasRect,
      );
      restoredLayers.push({
        id: `wappen-${wappenId}-${z}`,
        kind: 'wappen',
        src,
        wappenId,
        zIndex: w.zindex ?? z,
        ...pos,
      });
      z = Math.max(z, (w.zindex ?? z) + 1);
    }

    const nextZ = z;
    queueMicrotask(() => {
      setSelectedOrder(cosmeticIds);
      setItemMemos(memos);
      setLayers(restoredLayers);
      setNextZIndex(nextZ);
      setHasInitializedEdit(true);
    });
  }, [
    isEditMode,
    hasNumericPouchId,
    hasInitializedEdit,
    pouchDetailData?.result,
    itemsById,
  ]);

  useEffect(() => {
    if (!isEditMode || !hasNumericPouchId) {
      return;
    }
    const loadImageUrl = async () => {
      const list = await queryClient.fetchQuery({
        queryKey: getPouchListQueryKey(),
        queryFn: fetchPouchList,
      });
      const pouch = list?.result?.pouchList?.find(
        (p) => p.pouchId === numericPouchId,
      );
      if (pouch?.imageUrl) {
        setEditBackgroundUrl(pouch.imageUrl);
      }
    };
    void loadImageUrl();
  }, [isEditMode, hasNumericPouchId, numericPouchId, queryClient]);

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
      alert('\uD30C\uC6B0\uCE58\uC5D0 \uB123\uC744 \uD654\uC7A5\uD488\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.');
      return;
    }
    setStep('decorate');
    setIsSheetExpanded(false);
  };

  const addLayer = useCallback(
    (layer: CanvasLayer) => {
      setLayers((prev) => [...prev, layer]);
      setNextZIndex((z) => z + 1);
      setSelectedLayerId(layer.id);
    },
    [],
  );

  const handleAddCosmetic = (item: MyCosmeticsResponseDTO) => {
    const id = item.id;
    if (id == null) {
      return;
    }
    const src = getCosmeticImageSrc(item);
    if (!src) {
      return;
    }
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
      alert('\uD30C\uC6B0\uCE58\uC5D0 \uB123\uC744 \uD654\uC7A5\uD488\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.');
      return;
    }

    const canvasEl = document.getElementById(POUCH_CANVAS_EXPORT_ID);
    if (!canvasEl) {
      alert('\uD30C\uC6B0\uCE58 \uBBF8\uB9AC\uBCF4\uAE30\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
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

  const headerAction =
    step === 'select' ? (
      <PouchNextButton
        isDisabled={selectedOrder.length === 0}
        isLoading={false}
        onClick={handleNextSelect}
      />
    ) : (
      <PouchNextButton
        label={'\uC644\uB8CC'}
        isDisabled={isSaving}
        isLoading={isSaving}
        onClick={handleComplete}
      />
    );

  return (
    <div className="relative flex h-(--app-height) w-full flex-col overflow-hidden bg-white">
      <Header
        title={displayName}
        onBack={() => {
          if (step === 'decorate' && !isEditMode) {
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
              onLayersChange={setLayers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              backgroundImageUrl={isEditMode ? editBackgroundUrl : null}
            />
          ) : (
            <div className="flex h-full w-full max-w-[320px] items-center justify-center">
              <Image
                src={POUCHY_SRC}
                alt=""
                width={320}
                height={460}
                unoptimized
                className="h-auto max-h-full w-auto max-w-full object-contain"
                priority
              />
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
            selectedItems={selectedItems}
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
                    label: '\uC2A4\uCE94\uD558\uC5EC \uB4F1\uB85D\uD558\uAE30',
                    onClick: handleNavigateToScanRegister,
                    icon: '/icons/imgplus.svg',
                  },
                  {
                    label: '\uC9C1\uC811 \uB4F1\uB85D\uD558\uAE30',
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

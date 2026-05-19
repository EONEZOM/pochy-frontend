import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import {
  getCosmeticDetail,
  getGetCosmeticDetailQueryKey,
  useSearchMyCosmetics,
} from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import type {
  MyCosmeticsResponseDTO,
  PouchDetailDto,
  PouchItemDetailDto,
} from '@/api/model';

export const POUCH_COSMETIC_SEARCH_SIZE = 100;

type PouchItemWithCosmeticId = PouchItemDetailDto & {
  cosmeticId?: number;
};

const isPouchRowId = (item: PouchItemDetailDto, candidateId: number): boolean => {
  const rowId = item.id;
  return rowId != null && rowId > 0 && rowId === candidateId;
};

/**
 * 파우치 행의 내 화장품 ID (myCosmeticId 우선, 런타임 cosmeticId 폴백).
 * 행 id와 동일한 값은 파우치 아이템 PK일 수 있어 상세 API(/api/my-cosmetics/{id}) 호출에서 제외합니다.
 */
export const getPouchRowMyCosmeticId = (
  item: PouchItemDetailDto,
  listMap?: Map<number, MyCosmeticsResponseDTO>,
): number | undefined => {
  const myCosmeticId = item.myCosmeticId;
  if (myCosmeticId != null && myCosmeticId > 0) {
    if (isPouchRowId(item, myCosmeticId)) {
      if (listMap?.has(myCosmeticId)) {
        return myCosmeticId;
      }
      return undefined;
    }
    return myCosmeticId;
  }
  const cosmeticId = (item as PouchItemWithCosmeticId).cosmeticId;
  if (cosmeticId != null && cosmeticId > 0) {
    if (isPouchRowId(item, cosmeticId)) {
      if (listMap?.has(cosmeticId)) {
        return cosmeticId;
      }
      return undefined;
    }
    return cosmeticId;
  }
  return undefined;
};

export type PouchDetailEnrichedRow = PouchItemDetailDto & {
  imgUrl?: string;
  captureUrl?: string;
  linkCosmeticId?: number;
};

export const cosmeticNameBrandKey = (
  brand?: string | null,
  name?: string | null,
): string | null => {
  const normalizedBrand = (brand ?? '').trim().toLowerCase();
  const normalizedName = (name ?? '').trim().toLowerCase();
  if (!normalizedBrand && !normalizedName) {
    return null;
  }
  return `${normalizedBrand}|${normalizedName}`;
};

export const buildMyCosmeticsByIdMap = (
  items: MyCosmeticsResponseDTO[],
): Map<number, MyCosmeticsResponseDTO> => {
  const map = new Map<number, MyCosmeticsResponseDTO>();
  for (const item of items) {
    const id = item.id;
    if (id != null && id > 0) {
      map.set(id, item);
    }
  }
  return map;
};

export const buildCosmeticsByNameBrandMap = (
  items: MyCosmeticsResponseDTO[],
): Map<string, MyCosmeticsResponseDTO> => {
  const map = new Map<string, MyCosmeticsResponseDTO>();
  for (const item of items) {
    const key = cosmeticNameBrandKey(item.brand, item.name);
    if (key != null && !map.has(key)) {
      map.set(key, item);
    }
  }
  return map;
};

const mergeCosmeticIntoLookupMaps = (
  item: MyCosmeticsResponseDTO,
  byId: Map<number, MyCosmeticsResponseDTO>,
  byNameBrand: Map<string, MyCosmeticsResponseDTO>,
) => {
  const id = item.id;
  if (id != null && id > 0) {
    byId.set(id, item);
  }
  const key = cosmeticNameBrandKey(item.brand, item.name);
  if (key != null && !byNameBrand.has(key)) {
    byNameBrand.set(key, item);
  }
};

/** 파우치 행 id가 아닌 myCosmeticId만 수집 (행 id로 상세 API 호출 시 404) */
export const collectPouchCosmeticLookupIds = (
  pouchCosmetics: PouchItemDetailDto[] | undefined,
  listMap?: Map<number, MyCosmeticsResponseDTO>,
): number[] => {
  const ids = new Set<number>();
  for (const item of pouchCosmetics ?? []) {
    const myCosmeticId = getPouchRowMyCosmeticId(item, listMap);
    if (myCosmeticId != null) {
      ids.add(myCosmeticId);
    }
  }
  return [...ids];
};

export const sortPouchCosmeticRowsByZindex = (
  rows: PouchItemDetailDto[],
): PouchItemDetailDto[] => {
  return [...rows].sort((a, b) => (a.zindex ?? 0) - (b.zindex ?? 0));
};

/** 목록에 없는 ID·중복 제거 (순서 유지) */
export const sanitizeSelectedOrder = (
  selectedOrder: number[],
  validIds: ReadonlySet<number>,
): number[] => {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const id of selectedOrder) {
    if (!Number.isFinite(id) || id <= 0 || !validIds.has(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(id);
  }
  return result;
};

export type PouchSelectionRestore = {
  selectedOrder: number[];
  itemMemos: Record<number, string>;
};

/** 파우치 상세 + 내 화장품 lookup으로 선택·메모 복원 (zindex 순) */
export const buildSelectionRestoreFromPouchDetailWithLookup = (
  detail: PouchDetailDto,
  cosmeticsById: Map<number, MyCosmeticsResponseDTO>,
  cosmeticsByNameBrand: Map<string, MyCosmeticsResponseDTO>,
): PouchSelectionRestore => {
  const selectedOrder: number[] = [];
  const seenSelectedIds = new Set<number>();
  const itemMemos: Record<number, string> = {};

  const rows = sortPouchCosmeticRowsByZindex(detail.cosmetics ?? []);

  for (const row of rows) {
    const matched = resolvePouchRowCosmeticMatch(
      row,
      cosmeticsById,
      cosmeticsByNameBrand,
    );
    const linkId = matched?.id;
    if (linkId == null || linkId <= 0 || seenSelectedIds.has(linkId)) {
      continue;
    }
    seenSelectedIds.add(linkId);
    selectedOrder.push(linkId);
    const memo = row.memo?.trim();
    if (memo) {
      itemMemos[linkId] = memo;
    }
  }

  return { selectedOrder, itemMemos };
};

type UsePouchCosmeticsByIdOptions = {
  listItems?: MyCosmeticsResponseDTO[];
};

export const resolvePouchRowCosmeticMatch = (
  item: PouchItemDetailDto,
  cosmeticsById: Map<number, MyCosmeticsResponseDTO>,
  cosmeticsByNameBrand: Map<string, MyCosmeticsResponseDTO>,
): MyCosmeticsResponseDTO | undefined => {
  const myCosmeticId = getPouchRowMyCosmeticId(item, cosmeticsById);
  if (myCosmeticId != null) {
    const byId = cosmeticsById.get(myCosmeticId);
    if (byId) {
      return byId;
    }
  }
  const nameBrandKey = cosmeticNameBrandKey(item.brand, item.name);
  if (nameBrandKey != null) {
    const byNameBrand = cosmeticsByNameBrand.get(nameBrandKey);
    if (byNameBrand) {
      return byNameBrand;
    }
  }
  const rowId = item.id;
  if (rowId != null && rowId > 0) {
    const byRowId = cosmeticsById.get(rowId);
    if (byRowId) {
      return byRowId;
    }
  }
  return undefined;
};

/** 파우치 상세 행 — 내 화장품 lookup으로 브랜드·제품명·이미지 URL 보강 */
export const enrichPouchDetailRowWithCosmeticLookup = (
  item: PouchItemDetailDto,
  cosmeticsById: Map<number, MyCosmeticsResponseDTO>,
  cosmeticsByNameBrand: Map<string, MyCosmeticsResponseDTO>,
): PouchDetailEnrichedRow => {
  const matched = resolvePouchRowCosmeticMatch(
    item,
    cosmeticsById,
    cosmeticsByNameBrand,
  );
  const linkCosmeticId =
    matched?.id ?? getPouchRowMyCosmeticId(item, cosmeticsById);

  return {
    ...item,
    brand: (item.brand ?? '').trim() || matched?.brand,
    name: (item.name ?? '').trim() || matched?.name,
    category: item.category?.trim() || matched?.category,
    subCategory: item.subCategory?.trim() || matched?.subCategory,
    imgUrl: matched?.imgUrl,
    captureUrl: matched?.captureUrl,
    linkCosmeticId:
      linkCosmeticId != null && linkCosmeticId > 0 ? linkCosmeticId : undefined,
  };
};

const resolvePouchProductDedupeKey = (item: PouchDetailEnrichedRow): string | null => {
  if (item.linkCosmeticId != null && item.linkCosmeticId > 0) {
    return `cosmetic:${item.linkCosmeticId}`;
  }
  const myCosmeticId = getPouchRowMyCosmeticId(item);
  if (myCosmeticId != null) {
    return `my-cosmetic:${myCosmeticId}`;
  }
  return cosmeticNameBrandKey(item.brand, item.name);
};

/** 동일 제품(같은 myCosmeticId·이름)은 1행으로 합침 */
export const dedupePouchDetailRowsByProduct = (
  items: PouchDetailEnrichedRow[],
): PouchDetailEnrichedRow[] => {
  const byProductKey = new Map<string, PouchDetailEnrichedRow>();
  const withoutKey: PouchDetailEnrichedRow[] = [];

  for (const item of items) {
    const key = resolvePouchProductDedupeKey(item);
    if (key == null) {
      withoutKey.push(item);
      continue;
    }

    const existing = byProductKey.get(key);
    if (!existing) {
      byProductKey.set(key, item);
      continue;
    }

    const existingMemo = (existing.memo ?? '').trim();
    const nextMemo = (item.memo ?? '').trim();
    if (!existingMemo && nextMemo) {
      byProductKey.set(key, { ...existing, memo: item.memo });
    }
  }

  return [...byProductKey.values(), ...withoutKey];
};

/** 파우치 상세 행 — 내 화장품 목록 + 누락 ID 상세 조회로 이미지 URL 보강 */
export const usePouchCosmeticsById = (
  pouchCosmetics: PouchItemDetailDto[] | undefined,
  options?: UsePouchCosmeticsByIdOptions,
) => {
  const shouldFetchList =
    pouchCosmetics != null && options?.listItems === undefined;

  const { data: listData, isLoading: isListLoading } = useSearchMyCosmetics(
    {
      size: POUCH_COSMETIC_SEARCH_SIZE,
      sort: 'desc',
    },
    { query: { enabled: shouldFetchList } },
  );

  const listItems = options?.listItems ?? listData?.result?.content ?? [];

  const listMap = useMemo(
    () => buildMyCosmeticsByIdMap(listItems),
    [listItems],
  );

  const listNameBrandMap = useMemo(
    () => buildCosmeticsByNameBrandMap(listItems),
    [listItems],
  );

  const missingIds = useMemo(() => {
    const needed = collectPouchCosmeticLookupIds(pouchCosmetics, listMap);
    return needed.filter((id) => !listMap.has(id));
  }, [listMap, pouchCosmetics]);

  const detailQueries = useQueries({
    queries: missingIds.map((cosmeticId) => ({
      queryKey: getGetCosmeticDetailQueryKey(cosmeticId),
      queryFn: () => getCosmeticDetail(cosmeticId),
      enabled: cosmeticId > 0,
      staleTime: 60_000,
      retry: (failureCount: number, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404 || status === 401 || status === 403) {
          return false;
        }
        return failureCount < 1;
      },
    })),
  });

  const { cosmeticsById, cosmeticsByNameBrand } = useMemo(() => {
    const byId = new Map(listMap);
    const byNameBrand = new Map(listNameBrandMap);
    for (const query of detailQueries) {
      const item = query.data?.result as MyCosmeticsResponseDTO | undefined;
      if (item) {
        mergeCosmeticIntoLookupMaps(item, byId, byNameBrand);
      }
    }
    return { cosmeticsById: byId, cosmeticsByNameBrand: byNameBrand };
  }, [detailQueries, listMap, listNameBrandMap]);

  const isDetailsLoading = detailQueries.some(
    (query) => query.isLoading || (query.isFetching && !query.isError),
  );

  const isListPending =
    pouchCosmetics != null &&
    options?.listItems === undefined &&
    isListLoading;

  return {
    cosmeticsById,
    cosmeticsByNameBrand,
    isLoading: isListPending || isDetailsLoading,
  };
};

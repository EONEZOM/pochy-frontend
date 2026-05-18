import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import {
  getCosmeticDetail,
  getGetCosmeticDetailQueryKey,
  useSearchMyCosmetics,
} from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import type { MyCosmeticsResponseDTO, PouchItemDetailDto } from '@/api/model';

export const POUCH_COSMETIC_SEARCH_SIZE = 500;

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
): number | undefined => {
  const myCosmeticId = item.myCosmeticId;
  if (myCosmeticId != null && myCosmeticId > 0) {
    if (isPouchRowId(item, myCosmeticId)) {
      return undefined;
    }
    return myCosmeticId;
  }
  const cosmeticId = (item as PouchItemWithCosmeticId).cosmeticId;
  if (cosmeticId != null && cosmeticId > 0) {
    if (isPouchRowId(item, cosmeticId)) {
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
): number[] => {
  const ids = new Set<number>();
  for (const item of pouchCosmetics ?? []) {
    const myCosmeticId = getPouchRowMyCosmeticId(item);
    if (myCosmeticId != null) {
      ids.add(myCosmeticId);
    }
  }
  return [...ids];
};

export const resolvePouchRowCosmeticMatch = (
  item: PouchItemDetailDto,
  cosmeticsById: Map<number, MyCosmeticsResponseDTO>,
  cosmeticsByNameBrand: Map<string, MyCosmeticsResponseDTO>,
): MyCosmeticsResponseDTO | undefined => {
  const myCosmeticId = getPouchRowMyCosmeticId(item);
  if (myCosmeticId != null) {
    const byId = cosmeticsById.get(myCosmeticId);
    if (byId) {
      return byId;
    }
  }
  const nameBrandKey = cosmeticNameBrandKey(item.brand, item.name);
  if (nameBrandKey != null) {
    return cosmeticsByNameBrand.get(nameBrandKey);
  }
  return undefined;
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
) => {
  const { data: listData, isLoading: isListLoading } = useSearchMyCosmetics({
    size: POUCH_COSMETIC_SEARCH_SIZE,
    sort: 'desc',
  });

  const listItems = listData?.result?.content ?? [];

  const listMap = useMemo(
    () => buildMyCosmeticsByIdMap(listItems),
    [listItems],
  );

  const listNameBrandMap = useMemo(
    () => buildCosmeticsByNameBrandMap(listItems),
    [listItems],
  );

  const missingIds = useMemo(() => {
    const needed = collectPouchCosmeticLookupIds(pouchCosmetics);
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

  return {
    cosmeticsById,
    cosmeticsByNameBrand,
    isLoading: isListLoading || isDetailsLoading,
  };
};

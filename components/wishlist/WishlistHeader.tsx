'use client';

/**
 * 위시리스트 헤더 컴포넌트
 *
 * 검색 UX 패턴:
 *   isSearchOpen 상태로 타이틀 헤더 ↔ 검색 헤더를 토글합니다.
 *   검색어는 URL searchParams(?q=)에 동기화되어,
 *   useReadWishCosmeticsList의 keyword 파라미터로 서버 검색이 수행됩니다.
 *   검색창을 닫으면 q 파라미터를 삭제해 자동으로 전체 목록이 복원됩니다.
 *
 * 내 화장품의 MyCosmeticsHeader도 동일한 패턴을 따릅니다.
 */

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ExtraNav } from '@/components/common/ExtraNav';

export function WishlistHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(
    searchParams.get('q') || '',
  );

  const replaceWithParams = (params: URLSearchParams) => {
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const executeSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set('q', value.trim());
    } else {
      params.delete('q');
    }
    replaceWithParams(params);
  };

  const handleSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    replaceWithParams(params);
  };

  const filterTrigger = (
    <button type="button">
      <img src="/icons/filter.svg" alt="필터" width={24} height={24} />
    </button>
  );

  const handleClose = () => {
    setIsSearchOpen(false);
    executeSearch('');
  };

  if (isSearchOpen) {
    return (
      <Header
        variant="search"
        sticky
        onSearch={() => executeSearch(localSearchQuery)}
        onBack={handleClose}
        searchProps={{
          placeholder: '제품명 또는 브랜드 검색',
          autoFocus: true,
          value: localSearchQuery,
          onChange: (e) => setLocalSearchQuery(e.target.value),
          onKeyDown: (e) => {
            if (e.key === 'Escape') handleClose();
          },
        }}
        right={
          <ExtraNav
            side="bottom"
            align="end"
            trigger={filterTrigger}
            items={[
              { label: '최신순', onClick: () => handleSort('latest') },
              { label: '오래된순', onClick: () => handleSort('oldest') },
              { label: '가격 높은순', onClick: () => handleSort('price-desc') },
              { label: '가격 낮은순', onClick: () => handleSort('price-asc') },
            ]}
          />
        }
      />
    );
  }

  return (
    <Header
      title="위시리스트"
      sticky
      rightIcons={[
        {
          kind: 'search',
          onClick: () => {
            setLocalSearchQuery(searchParams.get('q') || '');
            setIsSearchOpen(true);
          },
        },
      ]}
      right={
        <ExtraNav
          side="bottom"
          align="end"
          trigger={filterTrigger}
          items={[
            { label: '최신순', onClick: () => handleSort('latest') },
            { label: '오래된순', onClick: () => handleSort('oldest') },
            { label: '가격 높은순', onClick: () => handleSort('price-desc') },
            { label: '가격 낮은순', onClick: () => handleSort('price-asc') },
          ]}
        />
      }
    />
  );
}

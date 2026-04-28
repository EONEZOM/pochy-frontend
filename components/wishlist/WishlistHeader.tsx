'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header/Header';

export function WishlistHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(
    searchParams.get('q') || '',
  );

  // URL params 바뀌면 동기화
  useEffect(() => {
    setLocalSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const executeSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set('q', value.trim());
    } else {
      params.delete('q');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
            if (e.key === 'Enter') executeSearch(localSearchQuery);
            if (e.key === 'Escape') handleClose();
          },
        }}
        rightIcons={[{ kind: 'filter', onClick: () => {} }]}
      />
    );
  }

  return (
    <Header
      title="위시리스트"
      sticky
      rightIcons={[
        { kind: 'search', onClick: () => setIsSearchOpen(true) },
        { kind: 'filter', onClick: () => {} },
      ]}
    />
  );
}

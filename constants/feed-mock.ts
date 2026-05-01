/** 피드 UI 목업 — API 연동 시 교체 */

export type FeedSortTab = 'recommended' | 'latest' | 'favorites';

export type FeedMockItem = {
  id: string;
  authorName: string;
  avatarEmoji: string;
  caption: string;
  timeLabel: string;
  title: string;
  /** 상세 상단 캐러셀에 표시할 제목들 — 없으면 title만 사용 */
  detailCarouselTitles?: string[];
  gridSubtitle?: string;
  reactions: string[];
  bookmarked?: boolean;
  categoryIds: string[];
};

export type FeedDetailProduct = {
  id: string;
  /** 카드 하단 표시명 (와이어: 브랜드명) */
  brandLabel: string;
  categoryId: string;
};

export const FEED_DETAIL_PRODUCTS: FeedDetailProduct[] = [
  { id: 'p1', brandLabel: '브랜드명', categoryId: 'lip' },
  { id: 'p2', brandLabel: '브랜드명', categoryId: 'face' },
  { id: 'p3', brandLabel: '브랜드명', categoryId: 'eye' },
  { id: 'p4', brandLabel: '브랜드명', categoryId: 'lip' },
  { id: 'p5', brandLabel: '브랜드명', categoryId: 'face' },
  { id: 'p6', brandLabel: '브랜드명', categoryId: 'eye' },
];

/** 목록 필터용 */
export const FEED_CATEGORY_CHIPS: { id: string; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'lip', label: '립' },
  { id: 'face', label: '페이스' },
  { id: 'eye', label: '아이' },
];

/** 상세 하단 칩 바 — 와이어처럼 전체 + 카테고리 반복 */
export const FEED_DETAIL_CHIP_BAR: { id: string; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'lip', label: '카테고리' },
  { id: 'face', label: '카테고리' },
  { id: 'eye', label: '카테고리' },
  { id: 'extra', label: '카테고리' },
];

export type FeedStickerHotspot = {
  id: string;
  title: string;
  tip: string;
  topPct: number;
  leftPct: number;
};

export const FEED_DEFAULT_STICKERS: FeedStickerHotspot[] = [
  {
    id: 'cup',
    title: '텀블러',
    tip: '출근길에 들고 다니기 좋아요.',
    topPct: 38,
    leftPct: 22,
  },
  {
    id: 'watch',
    title: '워치',
    tip: '데일리 코디 포인트로 활용해 보세요.',
    topPct: 52,
    leftPct: 48,
  },
  {
    id: 'shoe',
    title: '스니커즈',
    tip: '장시간 걸어도 편한 실루엣이에요.',
    topPct: 62,
    leftPct: 30,
  },
];

export const FEED_MOCK_ITEMS: FeedMockItem[] = [
  {
    id: '1',
    authorName: '예진',
    avatarEmoji: '🌸',
    caption: '예진님이 무인구 파우치를 만들었어요.',
    timeLabel: '1분 전',
    title: '예진의 무인구 파우치',
    detailCarouselTitles: ['예진의 꾸안꾸 파우치', '예진의 무인구 파우치'],
    gridSubtitle: '무인구 파우치 · 예진',
    reactions: ['❤️', '🔥', '😍'],
    bookmarked: false,
    categoryIds: ['all', 'lip', 'face'],
  },
  {
    id: '2',
    authorName: '민수',
    avatarEmoji: '💄',
    caption: '민수님이 데일리 메이크업 팔레트를 공유했어요.',
    timeLabel: '12분 전',
    title: '데일리 메이크업 팔레트',
    gridSubtitle: '팔레트 · 민수',
    reactions: ['👍', '✨'],
    bookmarked: true,
    categoryIds: ['all', 'eye', 'face'],
  },
  {
    id: '3',
    authorName: '소연',
    avatarEmoji: '🎀',
    caption: '소연님이 여름 파우치 구성을 올렸어요.',
    timeLabel: '1시간 전',
    title: '여름 파우치 구성',
    gridSubtitle: '파우치 · 소연',
    reactions: ['❤️', '🙌', '🔥'],
    bookmarked: false,
    categoryIds: ['all', 'lip'],
  },
];

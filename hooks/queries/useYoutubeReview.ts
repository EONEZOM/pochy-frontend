import { useQuery } from '@tanstack/react-query'

export type YoutubeVideoItem = {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle: string
    thumbnails: {
      high: { url: string }
    }
  }
}

export type YoutubeSearchResponse = {
  items?: YoutubeVideoItem[]
}

type UseYoutubeReviewOptions = {
  enabled?: boolean;
};

/**
 * 유튜브 리뷰 영상을 가져오는 커스텀 훅
 * @param query - 검색할 제품명 (브랜드 + 제품명)
 */
export const useYoutubeReview = (
  query: string,
  options?: UseYoutubeReviewOptions,
) => {
  const normalizedQuery = query.trim();
  const isEnabled =
    options?.enabled !== false && normalizedQuery.length > 0;

  return useQuery<YoutubeSearchResponse>({
    queryKey: ['youtube', normalizedQuery],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `/api/youtube?query=${encodeURIComponent(normalizedQuery + ' 리뷰')}`,
        { signal },
      );

      if (!res.ok) {
        throw new Error('유튜브 데이터를 가져오는데 실패했습니다.');
      }

      return res.json();
    },
    // 할당량 절약을 위한 공격적 캐싱 (6시간 동안 캐시 유지)
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 24, // 가비지 컬렉션 타임 (24시간)
    enabled: isEnabled,
    retry: 1, // 에러 발생 시 재시도는 한 번만
  });
};

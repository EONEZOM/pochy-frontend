import { useQuery } from '@tanstack/react-query'

/**
 * 유튜브 리뷰 영상을 가져오는 커스텀 훅
 * @param query - 검색할 제품명 (브랜드 + 제품명)
 */
export function useYoutubeReview(query: string) {
  return useQuery({
    queryKey: ['youtube', query],
    queryFn: async () => {
      const res = await fetch(
        `/api/youtube?query=${encodeURIComponent(query + ' 리뷰')}`,
      )

      if (!res.ok) {
        throw new Error('유튜브 데이터를 가져오는데 실패했습니다.')
      }

      return res.json()
    },
    // 할당량 절약을 위한 공격적 캐싱 (6시간 동안 캐시 유지)
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 24, // 가비지 컬렉션 타임 (24시간)
    enabled: !!query, // 쿼리가 있을 때만 실행
    retry: 1, // 에러 발생 시 재시도는 한 번만
  })
}

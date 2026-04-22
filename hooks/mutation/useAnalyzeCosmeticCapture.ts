import { useMutation } from '@tanstack/react-query'
import { convertToBase64 } from '@/utils/image-utils'

export const useAnalyzeCosmeticCapture = () => {
  return useMutation({
    mutationFn: async (images: string[]) => {
      const base64Images = await Promise.all(images.map(convertToBase64))

      const res = await fetch('/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '분석 중 오류가 발생했습니다.')
      }

      const data = await res.json()

      const mappedResults = data.results
        .filter((item: any) => item.is_cosmetic === true) // 화장품인 것만 필터링
        .map((item: any) => ({
          ...item,
          // GPT가 알려준 인덱스를 사용해 원본 images 배열에서 URL 추출
          image_url: images[item.image_index],
        }))

      return {
        ...data,
        results: mappedResults,
      }
    },
  })
}

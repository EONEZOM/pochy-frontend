import { useMutation } from '@tanstack/react-query'
import { convertBlobToBase64 } from '@/utils/image-utils'

export const useAnalyzeCosmeticCapture = () => {
  return useMutation({
    mutationFn: async (imageFiles: File[]) => {
      const base64Images = await Promise.all(
        imageFiles.map(convertBlobToBase64),
      )

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

      const filteredResults = (data.results ?? []).filter(
        (item: any) => item.is_cosmetic === true,
      )

      const mappedResults = await Promise.all(
        filteredResults.map(async (item: any) => {
          const searchQuery = `${item.brand_name} ${item.product_name}`
          let searchData: Record<string, unknown> = {}

          try {
            const searchRes = await fetch(
              `/api/naver/search?query=${encodeURIComponent(searchQuery)}`,
            )
            if (searchRes.ok) {
              searchData = await searchRes.json()
            }
          } catch {
            searchData = {}
          }

          const imageIndex = Number(item.image_index)
          const sourceImage =
            Number.isFinite(imageIndex) && imageFiles[imageIndex]
              ? imageFiles[imageIndex]
              : imageFiles[0]

          return {
            ...item,
            image_url: sourceImage ? URL.createObjectURL(sourceImage) : '',
            official_image: searchData.official_image || null,
            price: searchData.lowest_price || '정보 없음',
            link: searchData.mall_url || '',
          }
        }),
      )

      return {
        ...data,
        results: mappedResults,
      }
    },
  })
}

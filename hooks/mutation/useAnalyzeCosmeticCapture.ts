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

      const mappedResults = data.results
        .filter((item: any) => item.is_cosmetic === true)
        .map((item: any) => ({
          ...item,
          image_url: URL.createObjectURL(imageFiles[item.image_index]),
        }))

      return {
        ...data,
        results: mappedResults,
      }
    },
  })
}

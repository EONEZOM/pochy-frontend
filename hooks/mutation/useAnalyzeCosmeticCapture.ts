import { useMutation } from '@tanstack/react-query'
import { convertBlobToBase64, resizeImageFile } from '@/utils/image-utils'

export const useAnalyzeCosmeticCapture = () => {
  return useMutation({
    mutationFn: async (imageFiles: File[]) => {
      // GPT 전송 및 백엔드 등록 모두에 리사이징된 파일을 사용합니다.
      // Vercel 4.5MB body 제한과 OpenAI 업로드 한도를 동시에 회피합니다.
      const resizedFiles = await Promise.all(
        imageFiles.map((file) => resizeImageFile(file, 1280, 0.85)),
      )

      const base64Images = await Promise.all(
        resizedFiles.map(convertBlobToBase64),
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

      // Promise.all 병렬 요청은 Naver 레이트 리밋에 걸려 일부가 조용히 실패합니다.
      // 순차 요청 + 요청 사이 150ms 딜레이로 안정성을 높입니다.
      const mappedResults: Record<string, unknown>[] = []
      for (const item of filteredResults) {
        const searchQuery = `${item.brand_name} ${item.product_name}`
        let searchData: Record<string, unknown> = {}

        if (item.brand_name && item.product_name) {
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
          // 요청 간 간격을 두어 레이트 리밋 방지
          await new Promise((r) => setTimeout(r, 150))
        }

        const imageIndex = Number(item.image_index)
        const sourceFile =
          Number.isFinite(imageIndex) && resizedFiles[imageIndex]
            ? resizedFiles[imageIndex]
            : resizedFiles[0]

        mappedResults.push({
          ...item,
          image_url: sourceFile ? URL.createObjectURL(sourceFile) : '',
          official_image: searchData.official_image || null,
          price: searchData.lowest_price || '정보 없음',
          link: searchData.mall_url || '',
        })
      }

      return {
        ...data,
        results: mappedResults,
        // 백엔드 등록 시 리사이징된 파일을 재사용해 일관성을 유지합니다.
        resizedFiles,
      }
    },
  })
}

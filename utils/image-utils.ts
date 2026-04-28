import { ImageFileData } from '@/types/image'

/**
 * 이미지를 OpenAI 비전 최적화 규격(최대 768px)으로 리사이징
 * 파일 용량이 작아도 해상도가 높으면 토큰이 많이 소모되기 때문
 */
export const resizeImage = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onerror = () => reject(new Error('이미지 파일 읽기에 실패했습니다.'))
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onerror = () => reject(new Error('이미지 로드에 실패했습니다.'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIDE = 768 // OpenAI High Detail 모드 최적화 기준
        let width = img.width
        let height = img.height

        // 가로세로 비율 유지하며 리사이징
        if (width > height) {
          if (width > MAX_SIDE) {
            height *= MAX_SIDE / width
            width = MAX_SIDE
          }
        } else {
          if (height > MAX_SIDE) {
            width *= MAX_SIDE / height
            height = MAX_SIDE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        // JPEG로 변환하여 문자열 길이를 줄임 (품질 0.8)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
    }
  })
}

/**
 * FileList로부터 File 객체와 브라우저 프리뷰용 URL 쌍을 추출
 * 백엔드 전송을 위한 원본 파일 보존과 UI 렌더링을 동시에 처리
 * * @param fileList - input[type="file"]에서 전달받은 FileList 객체
 * @returns 각 파일의 원본 객체와 생성된 previewUrl을 포함하는 ImageFileData 배열
 */
export const extractImageFileData = (
  fileList: FileList | null,
): ImageFileData[] => {
  if (!fileList) return []

  return Array.from(fileList).map((file) => ({
    file,
    previewUrl: URL.createObjectURL(file),
  }))
}

/**
 * 생성된 모든 Preview URL을 브라우저 메모리에서 해제
 * URL.createObjectURL로 생성된 리소스는 명시적으로 해제하지 않으면
 * 페이지가 닫히기 전까지 메모리에 남아 성능 저하를 유발
 * * @param data - 해제할 previewUrl이 포함된 ImageFileData 배열
 */
export const revokeImagePreviewUrls = (data: ImageFileData[]): void => {
  data.forEach((item) => URL.revokeObjectURL(item.previewUrl))
}

/**
 * Blob 객체를 Base64 문자열로 변환합니다.
 */
export const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

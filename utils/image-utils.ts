/**
 * blob URL을 OpenAI가 인식 가능한 Base64로 변환합니다.
 * FileReader API를 사용하여 클라이언트 측에서 처리합니다.
 */
export const convertToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 이미지를 OpenAI 비전 최적화 규격(최대 768px)으로 리사이징
 * 파일 용량이 작아도 해상도가 높으면 토큰이 많이 소모되기 때문
 */
export const resizeImage = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
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

// lib/category.ts (혹은 utils/category.ts)
import { COSMETIC_CATEGORIES } from '@/constants/category'

/**
 * 영문 value 값을 기반으로 한글 라벨(label)을 찾아 반환
 */
export const getCategoryLabels = (mainValue?: string, subValue?: string) => {
  const defaultResult = { main: '-', sub: '-' }

  if (!mainValue) return defaultResult

  // 대분류 찾기
  const mainGroup = COSMETIC_CATEGORIES.find((c) => c.value === mainValue)
  const mainLabel = mainGroup?.label || mainValue

  // 소분류 찾기 (대분류가 있을 때만)
  let subLabel = subValue || '-'
  if (mainGroup && subValue) {
    const subItem = mainGroup.subCategories.find((s) => s.value === subValue)
    subLabel = subItem?.label || subValue
  }

  return {
    main: mainLabel,
    sub: subLabel,
  }
}

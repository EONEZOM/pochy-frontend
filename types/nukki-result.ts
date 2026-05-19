export interface NukkiResult {
  id: number;
  src: string;
  /** 누끼 성공 시 원본 Blob — 저장 시 blob URL fetch 없이 업로드 File 생성에 사용 */
  nukkiBlob?: Blob;
  /** true면 배경 제거 성공 — directImages 업로드에만 사용 */
  didRemoveBackground?: boolean;
  /** GPT 분석에 사용한 원본 크롭 base64(누끼 실패 시 표시·업로드 폴백) */
  cropBase64: string;
  brand: string;
  product_name: string;
  /** UI 표시용 한글 라벨 */
  product_type: string;
  /** API 저장·필터용 대분류 value (Base, SkinCare 등) */
  main_category: string;
  /** API 저장·필터용 소분류 value */
  sub_category: string;
  key_features: string[];
  confidence_score: number;
}

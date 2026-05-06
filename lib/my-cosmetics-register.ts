/**
 * 내 화장품 등록용 수동 멀티파트 래퍼
 *
 * wish-cosmetics.ts와 동일한 이유로 Orval 생성 훅 대신 직접 FormData를 구성합니다.
 * Spring @RequestPart + JSON 파트 Content-Type 문제 및 Blob→octet-stream 문제를
 * 동일한 패턴(File 변환 + JSON Blob)으로 해결합니다.
 *
 * @see lib/wish-cosmetics.ts - 동일 패턴 적용 예시 및 상세 설명
 */
import { customInstance } from '@/api/axios-instance';
import type { MyCosmeticsRequestDTO } from '@/api/model/myCosmeticsRequestDTO';

type RegisterMyCosmeticsPayload = {
  captureImages: File[];
  data: MyCosmeticsRequestDTO[];
};

export const registerMyCosmeticsMultipart = async ({
  captureImages,
  data,
}: RegisterMyCosmeticsPayload) => {
  const formData = new FormData();

  captureImages.forEach((file, index) => {
    const normalizedFile =
      file.type && file.type.length > 0
        ? file
        : new File([file], file.name || `capture-${index}.jpg`, {
            type: 'image/jpeg',
          });
    formData.append('captureImages', normalizedFile, normalizedFile.name);
  });

  data.forEach((item) => {
    formData.append(
      'data',
      new Blob([JSON.stringify(item)], { type: 'application/json' }),
    );
  });

  return customInstance({
    url: '/api/my-cosmetics',
    method: 'POST',
    data: formData,
  });
};

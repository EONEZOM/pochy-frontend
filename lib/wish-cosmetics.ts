/**
 * 위시리스트 화장품 등록용 수동 멀티파트 래퍼
 *
 * Orval이 자동 생성한 훅을 사용하지 않고 직접 FormData를 구성하는 이유:
 *   Orval 생성 코드는 JSON 데이터를 plain string으로 append합니다.
 *   Spring @RequestPart는 JSON 파트에 반드시 Content-Type: application/json이
 *   있어야 역직렬화할 수 있어서, new Blob([...], {type:'application/json'}) 패턴이 필수입니다.
 *
 *   또한 File 없이 순수 Blob을 append하면 일부 환경에서
 *   Content-Type이 application/octet-stream으로 전송되어 500 에러가 발생합니다.
 *   따라서 이미지는 항상 File 객체로 변환 후 파일명과 함께 append합니다.
 */
import { customInstance } from '@/api/axios-instance';
import type { CreateDetailDto } from '@/api/model';

type CreateWishCosmeticsMultipartPayload = {
  request: CreateDetailDto[];
  captureImages: File[];
};

export const createWishCosmeticsMultipart = async ({
  request,
  captureImages,
}: CreateWishCosmeticsMultipartPayload) => {
  const formData = new FormData();

  captureImages.forEach((image, index) => {
    const normalizedFile =
      image.type && image.type.length > 0
        ? image
        : new File([image], image.name || `capture-${index}.jpg`, {
            type: 'image/jpeg',
          });
    formData.append(
      'captureImages',
      normalizedFile,
      normalizedFile.name || `capture-${index}.jpg`,
    );
  });
  formData.append(
    'request',
    new Blob([JSON.stringify(request)], { type: 'application/json' }),
  );

  return customInstance({
    url: '/api/wish-cosmetics',
    method: 'POST',
    data: formData,
  });
};

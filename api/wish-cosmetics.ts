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

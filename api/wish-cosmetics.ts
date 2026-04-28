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
    formData.append('captureImages', image, image.name || `capture-${index}.jpg`);
  });
  request.forEach((item) => formData.append('request', JSON.stringify(item)));

  return customInstance({
    url: '/api/wish-cosmetics',
    method: 'POST',
    data: formData,
  });
};

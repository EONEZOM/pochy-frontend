import { customInstance } from '@/api/axios-instance';
import type { MyCosmeticsRequestDTO } from '@/api/model';

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

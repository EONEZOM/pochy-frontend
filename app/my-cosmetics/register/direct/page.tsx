'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import ProductDetailForm, {
  type ProductDetailFormImageSelectResult,
  type ProductDetailFormSubmitData,
} from '@/components/wishlist/ProductDetailForm';
import { getSearchMyCosmeticsQueryKey } from '@/api/generated/my-cosmetics-controller/my-cosmetics-controller';
import { ProductImageType } from '@/api/model/productImageType';
import { registerMyCosmeticsDirect } from '@/lib/my-cosmetics-direct';
import { removeProductBackground } from '@/lib/nukki';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import {
  clearPouchRegisterReturnPath,
  readPouchRegisterReturnPath,
} from '@/lib/pouch-setup';

const getRegisterErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error)) {
    return '내 화장품 등록 중 오류가 발생했습니다.';
  }
  const data = error.response?.data;
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>;
    const message = rec.message ?? rec.error ?? rec.detail;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim();
    }
  }
  if (error.response?.status === 400) {
    return '요청 형식이 맞지 않아 등록되지 않았습니다. 필수 정보를 확인해 주세요.';
  }
  if (error.response?.status === 500) {
    return '서버에서 처리하지 못했습니다. 다시 시도해 주세요.';
  }
  return '내 화장품 등록 중 오류가 발생했습니다.';
};

const urlToCaptureBlob = async (url: string): Promise<Blob> => {
  const resolved = resolveMediaUrl(url);
  const response = await fetch(resolved);
  if (!response.ok) {
    throw new Error('원본 이미지를 불러오지 못했습니다.');
  }
  return response.blob();
};

export default function MyCosmeticsDirectRegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const applyProductImageNukki = useCallback(
    async (source: string | File): Promise<ProductDetailFormImageSelectResult> => {
      const { blob, previewUrl, didRemoveBackground } =
        await removeProductBackground(source);
      return {
        official_image: previewUrl,
        nukkiBlob: didRemoveBackground ? blob : undefined,
      };
    },
    [],
  );

  const handleDirectSave = async (data: ProductDetailFormSubmitData) => {
    if (isPending) {
      return;
    }

    const imageFile = data.imageFile;
    const nukkiBlob =
      data.nukkiBlob instanceof Blob ? data.nukkiBlob : undefined;
    const originalUrl = String(data.image_url ?? '').trim();

    const hasLocalFile = imageFile instanceof File;
    const hasRemoteOriginal = /^https?:\/\//i.test(originalUrl);

    if (!hasLocalFile && !hasRemoteOriginal && !nukkiBlob) {
      alert('상품 사진을 등록하거나 AI 자동완성으로 이미지를 가져와 주세요.');
      return;
    }

    let captureImage: File | Blob | undefined = hasLocalFile ? imageFile : undefined;

    if (!captureImage && hasRemoteOriginal) {
      try {
        captureImage = await urlToCaptureBlob(originalUrl);
      } catch (error) {
        console.error('[MyCosmetics/register/direct] 원본 fetch 실패:', error);
        alert('원본 이미지를 불러오지 못했습니다. 직접 사진을 등록해 주세요.');
        return;
      }
    }

    const directImage = nukkiBlob ?? captureImage;
    if (!directImage) {
      alert('상품 사진을 등록해 주세요.');
      return;
    }

    const request = {
      name: String(data.product_name ?? ''),
      brand: String(data.brand_name ?? ''),
      category: String(data.main_category ?? ''),
      subCategory: String(data.sub_category ?? ''),
      feature: String(data.features ?? ''),
      memo: String(data.memo ?? ''),
      captureImageIndex: captureImage ? 0 : -1,
      productImage: {
        type: ProductImageType.DIRECT,
        directImageIndex: 0,
      },
    };

    setIsPending(true);
    try {
      await registerMyCosmeticsDirect({
        directImage,
        captureImage,
        request,
      });
      await queryClient.invalidateQueries({
        queryKey: getSearchMyCosmeticsQueryKey({ size: 100, sort: 'desc' }),
      });
      const returnPath = readPouchRegisterReturnPath();
      clearPouchRegisterReturnPath();
      alert('내 화장품에 저장되었습니다.');
      router.push(returnPath ?? '/my-cosmetics');
    } catch (error) {
      console.error('[MyCosmetics/register/direct] 등록 실패:', error);
      alert(getRegisterErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ProductDetailForm
      initialData={{}}
      headerTitle="직접 등록하기"
      layoutVariant="directRegister"
      hidePrice
      submitLabel={isPending ? '등록 중...' : '등록하기'}
      onBack={() => router.back()}
      onSubmit={handleDirectSave}
      onImageFileSelected={applyProductImageNukki}
      onOfficialImageUrlSelected={applyProductImageNukki}
    />
  );
}

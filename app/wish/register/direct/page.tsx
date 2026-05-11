'use client';

import ProductDetailForm from '@/components/wishlist/ProductDetailForm';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import type { CreateDetailDtoV2 } from '@/api/model';
import { ProductImageType } from '@/api/model';
import { createWishCosmeticsV2Multipart } from '@/lib/wish-cosmetics';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

const getWishRegisterErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error)) {
    return '위시리스트 등록 중 오류가 발생했습니다.';
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
    return '서버에서 처리하지 못했습니다. 이미지·네이버 상품 정보를 확인한 뒤 다시 시도해 주세요.';
  }
  return '위시리스트 등록 중 오류가 발생했습니다.';
};

const normalizePrice = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeImageUrl = (value: unknown): string | undefined => {
  const url = String(value ?? '').trim();
  if (!url || url.startsWith('blob:')) {
    return undefined;
  }
  const resolved = resolveMediaUrl(url);
  return resolved || undefined;
};

export default function DirectRegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const handleDirectSave = async (data: Record<string, unknown>) => {
    if (isPending) return;

    const imageFile = data.imageFile;
    const naverUrl = normalizeImageUrl(data.official_image ?? data.image_url);

    if (!(imageFile instanceof File) && !naverUrl) {
      alert(
        '상품 이미지가 필요합니다. 네이버쇼핑 정보를 채우거나 직접 사진을 등록해 주세요.',
      );
      return;
    }

    const hasLocalImage = imageFile instanceof File;
    const captureImages = hasLocalImage ? [imageFile] : ([] as File[]);
    const directImages = hasLocalImage ? [imageFile] : ([] as File[]);

    const productImage = hasLocalImage
      ? { type: ProductImageType.DIRECT, directImageIndex: 0 }
      : { type: ProductImageType.NAVER, naverImageUrl: naverUrl! };

    /** 캡처 파일이 없으면 인덱스 0으로 두면 백엔드가 빈 목록 접근으로 실패할 수 있음 */
    const captureImageIndex = captureImages.length > 0 ? 0 : -1;

    const row: CreateDetailDtoV2 = {
      name: String(data.product_name ?? ''),
      brand: String(data.brand_name ?? ''),
      category: String(data.main_category ?? ''),
      subCategory: String(data.sub_category ?? ''),
      feature: String(data.features ?? ''),
      memo: String(data.memo ?? ''),
      price: normalizePrice(data.price),
      captureImageIndex,
      productImage,
    };

    setIsPending(true);
    try {
      await createWishCosmeticsV2Multipart({
        request: [row],
        captureImages,
        directImages,
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/wish-cosmetics'] });
      alert('위시리스트에 등록되었습니다.');
      router.push('/wish');
    } catch (error) {
      console.error('[WishRegister/direct] 등록 실패:', error);
      alert(getWishRegisterErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ProductDetailForm
      initialData={{}}
      headerTitle="직접 등록하기"
      layoutVariant="directRegister"
      submitLabel={isPending ? '등록 중...' : '등록하기'}
      onBack={() => router.back()}
      onSubmit={handleDirectSave}
    />
  );
}

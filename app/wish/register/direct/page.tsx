'use client';

import ProductDetailForm from '@/components/wishlist/ProductDetailForm';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CreateDetailDtoV2 } from '@/api/model';
import { ProductImageType } from '@/api/model';
import { createWishCosmeticsV2Multipart } from '@/lib/wish-cosmetics';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

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
  const [isPending, setIsPending] = useState(false);

  const handleDirectSave = async (data: Record<string, unknown>) => {
    if (isPending) return;

    const imageFile = data.imageFile;
    const captureImages =
      imageFile instanceof File ? [imageFile] : ([] as File[]);
    const directImages =
      imageFile instanceof File ? [imageFile] : ([] as File[]);

    const naverUrl = normalizeImageUrl(data.official_image ?? data.image_url);

    const productImage =
      imageFile instanceof File
        ? { type: ProductImageType.DIRECT, directImageIndex: 0 }
        : naverUrl
          ? { type: ProductImageType.NAVER, naverImageUrl: naverUrl }
          : { type: ProductImageType.NAVER };

    const row: CreateDetailDtoV2 = {
      name: String(data.product_name ?? ''),
      brand: String(data.brand_name ?? ''),
      category: String(data.main_category ?? ''),
      subCategory: String(data.sub_category ?? ''),
      feature: String(data.features ?? ''),
      memo: String(data.memo ?? ''),
      price: normalizePrice(data.price),
      captureImageIndex: 0,
      productImage,
    };

    setIsPending(true);
    try {
      await createWishCosmeticsV2Multipart({
        request: [row],
        captureImages,
        directImages,
      });
      alert('위시리스트에 등록되었습니다.');
      router.push('/wish');
    } catch {
      alert('위시리스트 등록 중 오류가 발생했습니다.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ProductDetailForm
      initialData={{}} // 빈 값으로 시작
      submitLabel={isPending ? '등록 중...' : '위시리스트 추가'}
      onBack={() => router.back()}
      onSubmit={handleDirectSave}
      // TODO: 테스트 이후 직접 업로드/등록 정책 정상화 필요
      disableManualImageUpload
      autoFillNaverOnSubmit
    />
  );
}

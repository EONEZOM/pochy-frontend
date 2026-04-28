'use client';

import ProductDetailForm from '@/components/wishlist/ProductDetailForm';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CreateDetailDto } from '@/api/model';
import { createWishCosmeticsMultipart } from '@/api/wish-cosmetics';

const normalizePrice = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeImageUrl = (value: unknown): string | undefined => {
  const url = String(value ?? '').trim();
  if (!url || url.startsWith('blob:')) return undefined;
  return url;
};

export default function DirectRegisterPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleDirectSave = async (data: Record<string, unknown>) => {
    if (isPending) return;
    const request: CreateDetailDto = {
      name: String(data.product_name ?? ''),
      brand: String(data.brand_name ?? ''),
      category: String(data.main_category ?? ''),
      subCategory: String(data.sub_category ?? ''),
      feature: String(data.features ?? ''),
      memo: String(data.memo ?? ''),
      price: normalizePrice(data.price),
      productImageUrl: normalizeImageUrl(data.official_image ?? data.image_url),
    };

    const imageFile = data.imageFile;
    const captureImages =
      imageFile instanceof Blob ? [imageFile] : ([] as Blob[]);

    setIsPending(true);
    try {
      await createWishCosmeticsMultipart({ request: [request], captureImages });
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
    />
  );
}

'use client';

import ProductDetailForm from '@/components/wishlist/ProductDetailForm';
import { useWishlistStore } from '@/store/wishlistStore';
import { useRouter } from 'next/navigation';

export default function DirectRegisterPage() {
  const addItem = useWishlistStore((state) => state.addItem);
  const router = useRouter();

  const handleDirectSave = (data: any) => {
    addItem({
      ...data,
      id: Date.now(), // 고유 ID 생성
      created_at: new Date().toISOString(),
    });
    router.push('/wish');
  };

  return (
    <ProductDetailForm
      initialData={{}} // 빈 값으로 시작
      submitLabel="위시리스트 추가"
      onBack={() => router.back()}
      onSubmit={handleDirectSave}
    />
  );
}

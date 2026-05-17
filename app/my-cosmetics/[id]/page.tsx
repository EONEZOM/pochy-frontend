'use client';

import { useParams } from 'next/navigation';

import { MyCosmeticsDetailView } from '@/components/my-cosmetics/MyCosmeticsDetailView';

export default function MyCosmeticsDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const routeCosmeticId = Number(rawId);
  const isRouteCosmeticIdValid =
    rawId !== undefined &&
    rawId !== null &&
    String(rawId) !== '' &&
    Number.isFinite(routeCosmeticId) &&
    routeCosmeticId > 0;

  if (!isRouteCosmeticIdValid) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5 text-sm text-zinc-500">
        잘못된 제품 ID입니다.
      </div>
    );
  }

  return (
    <MyCosmeticsDetailView
      key={routeCosmeticId}
      routeCosmeticId={routeCosmeticId}
    />
  );
}

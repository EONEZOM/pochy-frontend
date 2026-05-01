'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import Input from '@/components/common/Input/Input';
import type { NukkiResult } from '@/components/my-cosmetics/NukkiResultCard';

interface MyCosmeticsDetailFormProps {
  item: NukkiResult;
  onBack: () => void;
  onSubmit: (updated: NukkiResult) => void;
}

export default function MyCosmeticsDetailForm({
  item,
  onBack,
  onSubmit,
}: MyCosmeticsDetailFormProps) {
  const [brand, setBrand] = useState(item.brand);
  const [productName, setProductName] = useState(item.product_name);
  const [productType, setProductType] = useState(item.product_type);
  const [keyFeatures, setKeyFeatures] = useState(item.key_features.join(', '));

  const handleSubmit = () => {
    onSubmit({
      ...item,
      brand,
      product_name: productName,
      product_type: productType,
      key_features: keyFeatures
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header
        className="border-b border-zinc-100"
        onBack={onBack}
        title="제품 정보"
        rightIcons={[
          {
            kind: 'register',
            text: '수정 완료',
            ariaLabel: '수정 완료',
            onClick: handleSubmit,
          },
        ]}
      />

      <main className="flex-1 space-y-6 p-5">
        {/* 누끼 이미지 */}
        <div
          className="relative mx-auto aspect-square w-36 overflow-hidden rounded-3xl bg-zinc-100"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%), linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 8px 8px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.src}
            alt={item.product_name}
            className="h-full w-full object-contain drop-shadow-lg"
          />
        </div>

        <div className="space-y-5">
          <span className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
            제품 정보
          </span>

          <div className="flex flex-col gap-1.5">
            <label className="pl-1 text-xs font-bold text-zinc-700">
              브랜드명
            </label>
            <Input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="브랜드명을 입력해주세요"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="pl-1 text-xs font-bold text-zinc-700">
              제품명
            </label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="제품명을 입력해주세요"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="pl-1 text-xs font-bold text-zinc-700">
              카테고리
            </label>
            <Input
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              placeholder="예: 스킨케어, 메이크업, 바디케어"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="pl-1 text-xs font-bold text-zinc-700">특징</label>
            <Input
              value={keyFeatures}
              onChange={(e) => setKeyFeatures(e.target.value)}
              placeholder="예: 보습, 미백, 자외선 차단"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

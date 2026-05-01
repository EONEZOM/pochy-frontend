'use client';

import { motion } from 'framer-motion';

export interface NukkiResult {
  id: number;
  src: string;
  /** 백엔드 등록 시 captureImages로 전송할 원본 크롭 base64 */
  cropBase64: string;
  brand: string;
  product_name: string;
  product_type: string;
  key_features: string[];
  confidence_score: number;
}

interface NukkiResultCardProps {
  item: NukkiResult;
}

export function NukkiResultCard({ item }: NukkiResultCardProps) {
  const confidencePct = Math.round(item.confidence_score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-md"
    >
      {/* 누끼 이미지 영역 - 체커보드 배경으로 투명도 표현 */}
      <div
        className="relative flex aspect-square w-full items-center justify-center p-4"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%), linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.src}
          alt={item.product_name}
          className="max-h-full max-w-full object-contain drop-shadow-lg"
        />
        {confidencePct > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-0.5 text-[9px] font-black text-white">
            {confidencePct}% 일치
          </span>
        )}
      </div>

      <div className="space-y-2 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-green-600">
          {item.brand || 'UNKNOWN'}
        </p>
        <h3 className="text-mono-jet line-clamp-2 text-sm font-black leading-tight">
          {item.product_name || '분석 실패'}
        </h3>
        <p className="text-mono-dark-gray text-xs">{item.product_type}</p>
        {item.key_features?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.key_features.slice(0, 2).map((f, i) => (
              <span key={i} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500">
                #{f}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function NukkiResultEmpty() {
  return (
    <div className="col-span-2 flex h-48 items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200">
      <p className="text-center text-xs text-zinc-400">
        화장품으로 분석된 결과가
        <br />
        여기에 표시됩니다
      </p>
    </div>
  );
}

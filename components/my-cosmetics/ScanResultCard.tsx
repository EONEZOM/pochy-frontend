'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export interface ScanResult {
  brand: string;
  product_name: string;
  product_type: string;
  key_features: string[];
  confidence_score: number;
  is_cosmetic: boolean;
  src: string;
}

interface ScanResultCardProps {
  result: ScanResult;
}

export function ScanResultCard({ result }: ScanResultCardProps) {
  const confidencePct = Math.round(result.confidence_score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-lg"
    >
      <div className="relative flex aspect-square w-full items-center justify-center bg-zinc-50 p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.src}
          alt={result.product_name}
          className="max-h-full max-w-full rounded-2xl object-contain"
        />
        {confidencePct > 0 && (
          <span className="bg-brand-pink/90 absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-black text-white">
            {confidencePct}%
          </span>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div>
          <p className="text-brand-pink text-[10px] font-black uppercase tracking-widest">
            {result.brand || 'UNKNOWN'}
          </p>
          <h3 className="text-mono-jet mt-1 text-lg font-black leading-tight">
            {result.product_name || '분석 실패'}
          </h3>
          <p className="text-mono-dark-gray mt-1 text-xs font-semibold">{result.product_type}</p>
        </div>

        {result.key_features?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.key_features.map((feature, i) => (
              <span
                key={i}
                className="rounded-xl bg-zinc-100 px-2.5 py-1 text-[10px] font-bold text-zinc-500"
              >
                #{feature}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ScanResultEmpty() {
  return (
    <div className="border-mono-gray flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed">
      <Image src="/icons/imgplus.svg" alt="" width={32} height={32} unoptimized className="opacity-20" />
      <p className="text-mono-dark-gray text-xs font-bold uppercase tracking-widest">
        {'분석 결과 대기중'}
      </p>
    </div>
  );
}

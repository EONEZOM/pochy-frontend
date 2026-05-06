'use client';

import Image from 'next/image';
import { useRef } from 'react';

interface ScanUploaderProps {
  isLoading: boolean;
  pipelineStep: string;
  onFileSelect: (file: File) => void;
}

export function ScanUploader({ isLoading, pipelineStep, onFileSelect }: ScanUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // 동일 파일 재선택 허용
    e.target.value = '';
  };

  return (
    <div className="relative">
      <label className="border-mono-gray hover:border-brand-pink flex h-80 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed bg-zinc-50 transition-all hover:bg-zinc-100">
        <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
          <Image src="/icons/imgplus.svg" alt="" width={28} height={28} unoptimized />
        </div>
        <div className="text-center">
          <p className="text-mono-jet text-sm font-bold">화장품 사진 업로드</p>
          <p className="text-mono-dark-gray mt-1 text-xs">실제 제품 사진을 올려주세요</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-3xl bg-black/70 backdrop-blur-sm">
          <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-xs font-bold text-white">{pipelineStep}</p>
        </div>
      )}
    </div>
  );
}

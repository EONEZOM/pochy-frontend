'use client';

import Image from 'next/image';
import { useRef } from 'react';

interface ScanUploaderProps {
  isLoading: boolean;
  pipelineStep: string;
  onFileSelect: (file: File) => void;
}

export function ScanUploader({
  isLoading,
  pipelineStep,
  onFileSelect,
}: ScanUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // \uB3D9\uC77C \uD30C\uC77C \uC7AC\uC120\uD0DD \uD5C8\uC6A9
    e.target.value = '';
  };

  return (
    <div className="relative">
      <label className="border-mono-gray hover:border-brand-pink flex h-80 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed bg-zinc-50 transition-all hover:bg-zinc-100">
        <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
          <Image src="/icons/imgplus.svg" alt="" width={28} height={28} />
        </div>
        <div className="text-center">
          <p className="text-mono-jet text-sm font-bold">
            {'\uD654\uC7A5\uD488 \uC0AC\uC9C4 \uC5C5\uB85C\uB4DC'}
          </p>
          <p className="text-mono-dark-gray mt-1 text-xs">
            {'\uC2E4\uC81C \uC81C\uD488 \uC0AC\uC9C4\uC744 \uC62C\uB824\uC8FC\uC138\uC694'}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {isLoading ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-3xl bg-black/70 backdrop-blur-sm">
          <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-xs font-bold text-white">{pipelineStep}</p>
        </div>
      ) : null}
    </div>
  );
}

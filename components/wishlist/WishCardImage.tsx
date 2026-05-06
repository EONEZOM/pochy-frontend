'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';

interface WishCardImageProps {
  officialImage: string;
  captureImage: string;
  productName: string;
  /** true일 때 Next.js Image의 fill 모드로 렌더링합니다 (캐러셀 등 절대 위치 컨테이너용). */
  fill?: boolean;
  className?: string;
}

/**
 * officialImage → captureImage → imgplus.svg 순으로 fallback합니다.
 * onError 핸들러로 URL이 깨진 경우(엑박)도 처리합니다.
 */
export function WishCardImage({
  officialImage,
  captureImage,
  productName,
  fill = false,
  className,
}: WishCardImageProps) {
  const initialSrc = officialImage || captureImage || '';
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  const handleError = useCallback(() => {
    if (src === officialImage && captureImage) {
      setSrc(captureImage);
    } else {
      setFailed(true);
    }
  }, [src, officialImage, captureImage]);

  if (failed) {
    if (fill) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
          <Image
            src="/icons/imgplus.svg"
            alt=""
            width={32}
            height={32}
            unoptimized
            className="opacity-30"
          />
        </div>
      );
    }
    return (
      <div className="flex aspect-square w-full items-center justify-center">
        <Image
          src="/icons/imgplus.svg"
          alt=""
          width={32}
          height={32}
          unoptimized
          className="opacity-30"
        />
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={productName}
        fill
        className={className ?? 'object-cover'}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={productName}
      width={0}
      height={0}
      sizes="100vw"
      style={{ width: '100%', height: 'auto' }}
      className={className ?? 'block object-contain'}
      onError={handleError}
    />
  );
}

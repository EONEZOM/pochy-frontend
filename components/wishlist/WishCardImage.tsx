'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';

interface WishCardImageProps {
  officialImage: string;
  captureImage: string;
  productName: string;
}

/**
 * official_image → capture_image → imgplus.svg 순으로 fallback합니다.
 * onError 핸들러로 URL이 깨진 경우(엑박)도 처리합니다.
 *
 * capture_image fallback은 백엔드가 ReadListDto에 captureImageUrl을
 * 추가하면 자동으로 활성화됩니다.
 */
export function WishCardImage({
  officialImage,
  captureImage,
  productName,
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
    return (
      <div className="flex aspect-3/4 w-full items-center justify-center">
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
    <Image
      src={src}
      alt={productName}
      width={0}
      height={0}
      sizes="100vw"
      style={{ width: '100%', height: 'auto' }}
      className="block object-contain"
      onError={handleError}
    />
  );
}

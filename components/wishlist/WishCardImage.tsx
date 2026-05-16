'use client';

import Image from 'next/image';
import { useState, useCallback, useMemo } from 'react';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { shouldBypassNextImageOptimizer } from '@/lib/next-image-src';
import { WISH_PLACEHOLDER_IMAGE_SRC } from '@/constants/wish-placeholders';

interface WishCardImageProps {
  officialImage: string;
  captureImage: string;
  productName: string;
  /** true일 때 Next.js Image의 fill 모드로 렌더링합니다 (캐러셀 등 절대 위치 컨테이너용). */
  fill?: boolean;
  className?: string;
  /** LCP·첫 카드 등에만 사용 (남용 시 역효과) */
  priority?: boolean;
  loading?: 'lazy' | 'eager';
}

interface WishCardImageViewProps extends WishCardImageProps {
  resolvedOfficial: string;
  resolvedCapture: string;
}

/**
 * officialImage → captureImage → Figma `img.svg` 플레이스홀더 순으로 fallback합니다.
 * onError 핸들러로 URL이 깨진 경우(엑박)도 처리합니다.
 * 백엔드 상대 경로(`wish_capture_img/…`)는 `resolveMediaUrl`로 절대 URL로 만듭니다.
 */
export function WishCardImage({
  officialImage,
  captureImage,
  productName,
  fill = false,
  className,
  priority = false,
  loading,
}: WishCardImageProps) {
  const resolvedOfficial = useMemo(
    () => resolveMediaUrl(officialImage),
    [officialImage],
  );
  const resolvedCapture = useMemo(
    () => resolveMediaUrl(captureImage),
    [captureImage],
  );

  const mediaKey = `${resolvedOfficial}|${resolvedCapture}`;

  return (
    <WishCardImageView
      key={mediaKey}
      officialImage={officialImage}
      captureImage={captureImage}
      productName={productName}
      fill={fill}
      className={className}
      priority={priority}
      loading={loading}
      resolvedOfficial={resolvedOfficial}
      resolvedCapture={resolvedCapture}
    />
  );
}

const WishCardImageView = ({
  resolvedOfficial,
  resolvedCapture,
  productName,
  fill = false,
  className,
  priority = false,
  loading,
}: WishCardImageViewProps) => {
  const initialSrc = resolvedOfficial || resolvedCapture || '';
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  const handleError = useCallback(() => {
    if (src === resolvedOfficial && resolvedCapture) {
      setSrc(resolvedCapture);
    } else {
      setFailed(true);
    }
  }, [src, resolvedOfficial, resolvedCapture]);

  if (failed) {
    if (fill) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F3F3F3]">
          <Image
            src={WISH_PLACEHOLDER_IMAGE_SRC}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="object-contain"
          />
        </div>
      );
    }
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-[#F3F3F3]">
        <Image
          src={WISH_PLACEHOLDER_IMAGE_SRC}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="object-contain"
        />
      </div>
    );
  }

  const bypassOptimizer = shouldBypassNextImageOptimizer(src);

  if (fill) {
    return (
      <Image
        src={src}
        alt={productName}
        fill
        className={className ?? 'object-cover'}
        onError={handleError}
        unoptimized={bypassOptimizer}
        priority={priority}
        loading={loading}
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
      unoptimized={bypassOptimizer}
      priority={priority}
      loading={loading}
    />
  );
};

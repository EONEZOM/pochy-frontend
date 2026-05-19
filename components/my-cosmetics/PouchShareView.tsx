'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Download, Link2 } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import {
  POUCH_SHARE_CAPTURE_ID,
  buildPouchDetailShareUrl,
  captureShareElement,
  ensureKakaoShareImageUrl,
  preparePouchSharePng,
  resolveKakaoFeedImageUrl,
  copyTextToClipboard,
  downloadBlob,
  shareImageFile,
  shareViaKakao,
} from '@/lib/pouch-share';
import { resolveFeedPouchImageUrl } from '@/lib/feed-display-image';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

type PouchShareViewProps = {
  pouchId: number;
  pouchName: string;
  imageUrl: string | null;
};

export function PouchShareView({
  pouchId,
  pouchName,
  imageUrl,
}: PouchShareViewProps) {
  const router = useRouter();
  const captureRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const displayImageUrl = useMemo(() => {
    if (!imageUrl?.trim()) {
      return null;
    }
    const resolved = resolveDisplayImageSrc(
      resolveMediaUrl(resolveFeedPouchImageUrl(imageUrl)),
    );
    return resolved || null;
  }, [imageUrl]);

  const getCaptureBlob = async () => {
    const el = captureRef.current;
    if (!el) {
      throw new Error('공유 영역을 찾지 못했습니다.');
    }
    return captureShareElement(el);
  };

  const handleKakao = async () => {
    setIsProcessing(true);
    try {
      const linkUrl = buildPouchDetailShareUrl(
        window.location.origin,
        pouchId,
        pouchName,
      );
      let captureBlob: Blob | null = null;
      if (!resolveKakaoFeedImageUrl(imageUrl)) {
        captureBlob = await getCaptureBlob();
      }
      const kakaoImageUrl = await ensureKakaoShareImageUrl({
        imageUrl,
        pouchId,
        captureBlob,
      });

      await shareViaKakao({
        title: pouchName,
        description: '내 파우치를 공유해요',
        imageUrl: kakaoImageUrl ?? '',
        linkUrl,
      });
    } catch {
      try {
        const blob = await getCaptureBlob();
        const linkUrl = buildPouchDetailShareUrl(
          window.location.origin,
          pouchId,
          pouchName,
        );
        await shareImageFile(blob, { pouchId, pouchName, linkUrl });
      } catch (inner) {
        const message =
          inner instanceof Error ? inner.message : '공유에 실패했습니다.';
        alert(message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    try {
      const blob = await getCaptureBlob();
      const linkUrl = buildPouchDetailShareUrl(
        window.location.origin,
        pouchId,
        pouchName,
      );
      const prepared = await preparePouchSharePng(blob, {
        pouchId,
        pouchName,
        linkUrl,
      });
      downloadBlob(prepared.blob, prepared.filename);
    } catch (err) {
      alert(err instanceof Error ? err.message : '다운로드에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyLink = async () => {
    setIsProcessing(true);
    try {
      const url = buildPouchDetailShareUrl(
        window.location.origin,
        pouchId,
        pouchName,
      );
      await copyTextToClipboard(url);
      alert('링크가 복사되었어요.');
    } catch {
      alert('링크 복사에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-(--app-height) flex-col overflow-hidden bg-white">
      <Header
        title={'파우치 공유하기'}
        onBack={() => {
          router.back();
        }}
        className="shrink-0 border-b border-zinc-100 pt-[var(--safe-area-top)]"
      />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-8">
        <div className="flex w-full flex-col items-center gap-8">
          <div
            id={POUCH_SHARE_CAPTURE_ID}
            ref={captureRef}
            className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-[10px] shadow-[1px_1px_3px_rgba(0,0,0,0.25)]"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,1) 31%, rgba(255,198,236,1) 100%)',
            minHeight: 'min(474px, 58vh)',
          }}
        >
          {displayImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImageUrl}
              alt={pouchName}
              className="relative z-10 max-h-[min(42vh,360px)] w-auto max-w-[85%] object-contain"
            />
          ) : (
            <Image
              src="/figma/my/pouchy.svg"
              alt=""
              width={200}
              height={320}
              unoptimized
              className="relative z-10 h-auto max-h-[360px] w-auto object-contain opacity-80"
            />
          )}
          </div>

          <div className="flex w-full items-center justify-center gap-4">
            <ShareActionButton
              label={'카카오톡'}
              iconSrc="/figma/login/kakao-icon.png"
              bgClass="bg-[#FEE500]"
              disabled={isProcessing}
              onClick={handleKakao}
            />
            <ShareActionButton
              label={'다운로드'}
              iconKind="download"
              bgClass="bg-[#ffffff] border border-[#DCDCDC]"
              disabled={isProcessing}
              onClick={handleDownload}
            />
            <ShareActionButton
              label={'링크'}
              iconKind="link"
              iconClassName="rotate-45"
              bgClass="bg-[#ffffff] border border-[#DCDCDC]"
              disabled={isProcessing}
              onClick={handleCopyLink}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function ShareActionButton({
  label,
  iconSrc,
  iconKind,
  iconClassName,
  bgClass,
  disabled,
  onClick,
}: {
  label: string;
  iconSrc?: string;
  iconKind?: 'download' | 'link';
  iconClassName?: string;
  bgClass: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex size-14 flex-col items-center justify-center gap-1 rounded-full ${bgClass} disabled:opacity-50`}
      aria-label={label}
    >
      {iconSrc ? (
        <Image
          src={iconSrc}
          alt=""
          width={24}
          height={22}
          unoptimized
          className={iconClassName}
        />
      ) : iconKind === 'download' ? (
        <Download
          className={`size-6 text-[#161618] ${iconClassName ?? ''}`}
          strokeWidth={1.5}
        />
      ) : (
        <Link2
          className={`size-6 text-[#161618] ${iconClassName ?? ''}`}
          strokeWidth={1.5}
        />
      )}
    </button>
  );
}

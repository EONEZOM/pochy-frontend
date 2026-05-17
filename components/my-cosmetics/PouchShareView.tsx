'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Download, Link2 } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import {
  POUCH_SHARE_CAPTURE_ID,
  buildPouchDetailShareUrl,
  captureShareElement,
  copyTextToClipboard,
  downloadBlob,
  shareImageFile,
  shareViaKakao,
} from '@/lib/pouch-share';

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
      const shareImage =
        imageUrl ??
        (captureRef.current
          ? URL.createObjectURL(await getCaptureBlob())
          : '');

      await shareViaKakao({
        title: pouchName,
        description: '내 파우치를 공유해요',
        imageUrl: shareImage.startsWith('blob:') ? '' : shareImage,
        linkUrl,
      });
    } catch {
      try {
        const blob = await getCaptureBlob();
        await shareImageFile(blob, pouchName);
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
      downloadBlob(blob, `pouch-${pouchId}.png`);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : '다운로드에 실패했습니다.',
      );
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

      <main className="flex min-h-0 flex-1 flex-col items-center px-5 pt-4 pb-8">
        <div
          id={POUCH_SHARE_CAPTURE_ID}
          ref={captureRef}
          className="relative flex w-full max-w-[321px] flex-1 flex-col items-center justify-center overflow-hidden rounded-[10px] shadow-[1px_1px_3px_rgba(0,0,0,0.25)]"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,1) 31%, rgba(255,198,236,1) 100%)',
            minHeight: 'min(474px, 58vh)',
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
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

        <div className="mt-8 flex w-full max-w-[280px] items-center justify-center gap-4">
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
            bgClass="bg-[#DCDCDC]"
            disabled={isProcessing}
            onClick={handleDownload}
          />
          <ShareActionButton
            label={'링크'}
            iconKind="link"
            bgClass="bg-[#DCDCDC]"
            disabled={isProcessing}
            onClick={handleCopyLink}
          />
        </div>
      </main>
    </div>
  );
}

function ShareActionButton({
  label,
  iconSrc,
  iconKind,
  bgClass,
  disabled,
  onClick,
}: {
  label: string;
  iconSrc?: string;
  iconKind?: 'download' | 'link';
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
        <Image src={iconSrc} alt="" width={24} height={22} unoptimized />
      ) : iconKind === 'download' ? (
        <Download className="size-6 text-[#161618]" strokeWidth={1.5} />
      ) : (
        <Link2 className="size-6 text-[#161618]" strokeWidth={1.5} />
      )}
    </button>
  );
}

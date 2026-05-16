'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Modal } from '@/components/common/Modal';
import { classifyReissueError } from '@/lib/reissue-error';
import { markOpeningSeen } from '@/lib/opening-seen';
import { preloadOpeningAssets } from '@/lib/preload-opening-assets';
import { reissueWithTimeout } from '@/lib/reissue-with-timeout';
import { resolvePostAuthPath } from '@/lib/resolve-post-auth-path';
import { cn } from '@/lib/utils';

const OPENING_TOP_POUCH_SRC = '/figma/opening/위파우치.svg';
const OPENING_BOTTOM_POUCH_SRC = '/figma/opening/아래파우치.svg';
const OPENING_SLIDE_SRC = '/figma/opening/opening-슬라이드.svg';
const OPENING_LOGO_SRC = '/logo/main-logo.png';

const SLIDE_MASK_STYLE = {
  maskImage:
    'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
  WebkitMaskImage:
    'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
} as const;

/** 슬라이드 창 — 아래파우치 입구 위쪽에 맞춤 (366×186 SVG 비율 기준) */
const SLIDE_WINDOW_BOTTOM = 'min(40vw, 148px)';

const POUCH_IMAGE_CLASS =
  'block h-auto w-full max-w-none border-0 outline-none shadow-none [backface-visibility:hidden]';

/**
 * Figma `오프닝` (862-9063) — 파우치 상승 · 슬라이드 무한 낙하 · 로고·CTA
 */
export function OpeningScreen() {
  const router = useRouter();
  const [isReissuePending, setIsReissuePending] = useState(false);
  const [isNoAccountModalOpen, setIsNoAccountModalOpen] = useState(false);
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState(false);
  const [isNetworkErrorModalOpen, setIsNetworkErrorModalOpen] = useState(false);

  useEffect(() => {
    preloadOpeningAssets();
  }, []);

  const handleExistingAccountLogin = useCallback(async () => {
    if (isReissuePending) {
      return;
    }
    setIsReissuePending(true);
    try {
      await reissueWithTimeout();
      markOpeningSeen();
      const nextPath = await resolvePostAuthPath();
      router.replace(nextPath);
    } catch (error) {
      const failureKind = classifyReissueError(error);
      if (failureKind === 'noAccount') {
        setIsNoAccountModalOpen(true);
        return;
      }
      if (failureKind === 'sessionExpired') {
        setIsSessionExpiredModalOpen(true);
        return;
      }
      setIsNetworkErrorModalOpen(true);
    } finally {
      setIsReissuePending(false);
    }
  }, [isReissuePending, router]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full leading-none"
        aria-hidden
      >
        <div className="relative w-full">
          <div className="relative z-[3] w-full">
            <Image
              src={OPENING_BOTTOM_POUCH_SRC}
              alt=""
              width={366}
              height={186}
              unoptimized
              sizes="100vw"
              className={cn(
                POUCH_IMAGE_CLASS,
                'opening-pouch-rise opening-pouch-rise--delay translate-y-px',
              )}
              priority
            />
          </div>

          <div
            className="absolute inset-x-0 z-[2] h-[min(38vh,300px)] overflow-hidden"
            style={{
              ...SLIDE_MASK_STYLE,
              bottom: SLIDE_WINDOW_BOTTOM,
            }}
          >
            <div className="opening-slide-fall">
              <Image
                src={OPENING_SLIDE_SRC}
                alt=""
                width={456}
                height={2398}
                unoptimized
                className={cn(POUCH_IMAGE_CLASS, 'shrink-0')}
                priority
              />
              <Image
                src={OPENING_SLIDE_SRC}
                alt=""
                width={456}
                height={2398}
                unoptimized
                className={cn(POUCH_IMAGE_CLASS, 'shrink-0')}
                aria-hidden
              />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-[-50px] z-[1] w-full -translate-y-[calc(min(20vw,180px)+50px)] md:-translate-y-[min(20vw,180px)]">
            <Image
              src={OPENING_TOP_POUCH_SRC}
              alt=""
              width={366}
              height={180}
              unoptimized
              sizes="100vw"
              className={cn(POUCH_IMAGE_CLASS, 'opening-pouch-rise -mb-px')}
              priority
            />
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto flex min-h-0 w-full max-w-[360px] flex-1 flex-col px-5 pt-[max(2.5rem,var(--safe-area-top))] pb-[max(1.25rem,var(--safe-area-bottom))]">
        <div className="flex shrink-0 justify-center pt-[clamp(3rem,18vh,7rem)]">
          <Image
            src={OPENING_LOGO_SRC}
            alt="POCHY"
            width={180}
            height={121}
            className="h-auto w-[min(180px,50vw)] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
            priority
          />
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-3 pb-2">
          <Link
            href="/login"
            onClick={markOpeningSeen}
            className={cn(
              'flex h-14 w-[205px] max-w-full items-center justify-center rounded-full',
              'bg-[#FF93DB] text-base font-bold text-[#161618]',
              'transition-transform active:scale-[0.98]',
            )}
          >
            시작하기
          </Link>

          <button
            type="button"
            onClick={() => void handleExistingAccountLogin()}
            disabled={isReissuePending}
            className={cn(
              'text-mono-dark-gray min-h-10 text-sm leading-5 font-normal underline-offset-2',
              'hover:text-[#FF60CA] hover:underline disabled:opacity-60',
            )}
          >
            {isReissuePending ? (
              <span className="inline-flex items-center gap-2">
                <span className="border-mono-dark-gray size-3.5 animate-spin rounded-full border-2 border-t-transparent" />
                확인 중...
              </span>
            ) : (
              <>
                이미 계정이 있나요?{' '}
                <span className="text-[#FF60CA]">로그인</span>
              </>
            )}
          </button>
        </div>
      </div>

      <Modal
        open={isNoAccountModalOpen}
        onOpenChange={setIsNoAccountModalOpen}
        title="안내"
        description="계정이 없습니다. 생성해주세요."
        confirmText="확인"
        variant="warning"
        closeOnOverlayClick={false}
      />

      <Modal
        open={isSessionExpiredModalOpen}
        onOpenChange={setIsSessionExpiredModalOpen}
        title="안내"
        description="로그인이 만료되었어요. 다시 로그인해 주세요."
        confirmText="확인"
        variant="warning"
        closeOnOverlayClick={false}
      />

      <Modal
        open={isNetworkErrorModalOpen}
        onOpenChange={setIsNetworkErrorModalOpen}
        title="안내"
        description="연결이 지연되고 있어요. 잠시 후 다시 시도해 주세요."
        confirmText="확인"
        variant="warning"
        closeOnOverlayClick={false}
      />
    </div>
  );
}

'use client';

import * as React from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const WARNING_ICON_SRC = '/icons/느낌표-pink.svg';

export type WithdrawConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
};

/**
 * Figma `포치 임시` — 탈퇴 확인 (node `32:5530`).
 * 카드: 스캔 팁 모달과 동일(max-w 340, r 24, px-10, shadow-xl)·핑크 포인트·본문 14px/150%.
 * 버튼: Figma `32:5535` — 취소 `mono-jet` 배경·흰 글자, 탈퇴하기 `mono-dark-gray`(#B7B7B7)·흰 글자.
 */
export function WithdrawConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: WithdrawConfirmModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isPending, onOpenChange]);

  const handleConfirm = React.useCallback(() => {
    if (isPending) {
      return;
    }
    onConfirm();
  }, [isPending, onConfirm]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="bg-mono-jet/45 fixed inset-0 z-50 flex items-center justify-center p-5"
      onClick={() => {
        if (!isPending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-modal-title"
        aria-describedby="withdraw-modal-desc"
        className={cn(
          'w-full max-w-[340px] rounded-[24px] bg-white px-10 py-4 shadow-xl',
          'flex flex-col items-center gap-6',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          <Image
            src={WARNING_ICON_SRC}
            alt=""
            width={30}
            height={30}
            className="size-8 shrink-0"
            aria-hidden
          />
          <span className="text-brand-pink text-base leading-5 font-bold">
            주의 사항
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p
            id="withdraw-modal-desc"
            className="text-mono-jet w-full min-w-[280px] text-center text-sm leading-[150%] font-normal whitespace-pre-line"
          >
            {`회원 탈퇴 시 계정 및 이용 기록이 삭제되며,\n삭제된 데이터는 복구할 수 없습니다.\n정말 탈퇴하시겠어요?`}
          </p>
        </div>

        <div className="flex w-full gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!isPending) {
                onOpenChange(false);
              }
            }}
            className="bg-mono-jet text-mono-white hover:bg-mono-jet/90 h-10 min-w-0 flex-1 shrink-0 rounded-full border border-transparent px-3 text-base leading-5 font-bold transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className="bg-mono-dark-gray text-mono-white hover:bg-mono-dark-gray/90 h-10 min-w-0 flex-1 shrink-0 rounded-full border border-transparent px-3 text-base leading-5 font-bold transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? '처리 중...' : '탈퇴하기'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

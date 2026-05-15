'use client';

import * as React from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnConfirm?: boolean;
  closeOnCancel?: boolean;
  hideIcon?: boolean;
  variant?: 'warning' | 'success' | 'error';
  className?: string;
  children?: React.ReactNode;
};

const WARNING_ICON_SRC = '/icons/warning.svg';
const MODAL_VARIANT_META = {
  warning: {
    defaultTitle: '주의',
    confirmButtonClassName: 'bg-mono-jet  text-white hover:bg-brand-classic/90',
  },
  success: {
    defaultTitle: '완료',
    confirmButtonClassName:
      'bg-mono-jet text-white min-w-24 hover:bg-brand-classic/90',
  },
  error: {
    defaultTitle: '오류',
    confirmButtonClassName: 'bg-mono-jet  text-white hover:bg-brand-classic/90',
  },
} as const;

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  showCancel = false,
  closeOnOverlayClick = true,
  closeOnConfirm = true,
  closeOnCancel = true,
  hideIcon = false,
  variant = 'warning',
  className,
  children,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const handleConfirm = React.useCallback(() => {
    onConfirm?.();
    if (closeOnConfirm) onOpenChange(false);
  }, [closeOnConfirm, onConfirm, onOpenChange]);

  const handleCancel = React.useCallback(() => {
    onCancel?.();
    if (closeOnCancel) onOpenChange(false);
  }, [closeOnCancel, onCancel, onOpenChange]);

  const resolvedTitle = title ?? MODAL_VARIANT_META[variant].defaultTitle;

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="bg-mono-jet/45 fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => {
        if (closeOnOverlayClick) onOpenChange(false);
      }}
    >
      {/* 모달 컨테이너 */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label={resolvedTitle}
        className={cn(
          'w-full max-w-[360px] rounded-[20px] bg-white px-6 py-5 text-center shadow-[0_8px_30px_rgba(22,22,24,0.22)]',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {/* 아이콘 */}
        {!hideIcon && (
          <div className="mx-auto mb-3 flex size-6 items-center justify-center">
            {variant === 'warning' ? (
              <Image
                src={WARNING_ICON_SRC}
                alt=""
                width={24}
                height={24}
                unoptimized
              />
            ) : null}
            {variant === 'success' ? (
              <CheckCircle2 className="size-6 text-black" />
            ) : null}
            {variant === 'error' ? (
              <XCircle className="text-mono-jet size-6" />
            ) : null}
          </div>
        )}

        {resolvedTitle ? (
          <h2 className="text-mono-jet text-[34px] leading-[34px] font-bold">
            {resolvedTitle}
          </h2>
        ) : null}

        {(description || children) && (
          <div className="text-mono-jet mt-4 text-base leading-5 font-bold whitespace-pre-line">
            {children ?? description}
          </div>
        )}

        {/* 확인 버튼과 취소 버튼 */}
        <div
          className={cn(
            'mt-6 flex justify-center gap-2',
            showCancel && 'gap-3',
          )}
        >
          {showCancel && (
            <Button
              type="button"
              variant="default"
              size="md"
              className="min-w-24"
              onClick={handleCancel}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            variant="solid"
            size="md"
            className={cn(
              'text-mono-white bg-mono-jet hover:bg-mono-jet/90 min-w-24',
              MODAL_VARIANT_META[variant].confirmButtonClassName,
            )}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

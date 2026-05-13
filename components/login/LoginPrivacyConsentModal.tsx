'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

import { EulaConsentContent } from '@/components/login/consent-content/EulaConsentContent';
import { OptionalPersonalInfoConsentContent } from '@/components/login/consent-content/OptionalPersonalInfoConsentContent';
import { PrivacyConsentContent } from '@/components/login/consent-content/PrivacyConsentContent';
import { ServiceTermsConsentContent } from '@/components/login/consent-content/ServiceTermsConsentContent';
import { cn } from '@/lib/utils';

type ConsentKey = 'age' | 'terms' | 'eula' | 'privacy' | 'optional';

type ConsentItem = {
  key: ConsentKey;
  label: string;
  required: boolean;
  showChevron: boolean;
  detailContent?: React.ReactNode;
};

const CONSENT_ITEMS: ConsentItem[] = [
  {
    key: 'age',
    label: '(필수) 만 14세 이상입니다.',
    required: true,
    showChevron: false,
  },
  {
    key: 'terms',
    label: '(필수) 서비스 이용약관 동의',
    required: true,
    showChevron: true,
    detailContent: <ServiceTermsConsentContent />,
  },
  {
    key: 'eula',
    label: '(필수) 최종 사용자 라이선스 계약 동의',
    required: true,
    showChevron: true,
    detailContent: <EulaConsentContent />,
  },
  {
    key: 'privacy',
    label: '(필수) 개인정보 처리방침 동의',
    required: true,
    showChevron: true,
    detailContent: <PrivacyConsentContent />,
  },
  {
    key: 'optional',
    label: '(선택) 개인정보 수집 및 이용 동의',
    required: false,
    showChevron: true,
    detailContent: <OptionalPersonalInfoConsentContent />,
  },
];

const REQUIRED_KEYS = CONSENT_ITEMS.filter((item) => item.required).map(
  (item) => item.key,
);

const SCROLLABLE_PANEL_CLASSNAME =
  'scrollbar-hide min-h-0 touch-pan-y overflow-y-auto overscroll-y-contain [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const handleScrollPointerGuard = (
  event: React.TouchEvent<HTMLDivElement> | React.WheelEvent<HTMLDivElement>,
) => {
  event.stopPropagation();
};

const createEmptyConsentState = (): Record<ConsentKey, boolean> => ({
  age: false,
  terms: false,
  eula: false,
  privacy: false,
  optional: false,
});

export type LoginPrivacyConsentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgree: () => void;
  onCancelIncomplete?: () => void;
};

type ConsentCheckboxControlProps = {
  checked: boolean;
  className?: string;
};

export const ConsentCheckboxControl = ({
  checked,
  className,
}: ConsentCheckboxControlProps) => {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded border-2 p-0.5',
        checked
          ? 'border-brand-lavender bg-brand-lavender'
          : 'border-mono-dark-gray bg-white',
        className,
      )}
    >
      {checked ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
    </span>
  );
};

type ConsentListProps = {
  consents: Record<ConsentKey, boolean>;
  isAllChecked: boolean;
  expandedKey: ConsentKey | null;
  onToggleAll: () => void;
  onToggleItem: (key: ConsentKey) => void;
  onToggleExpand: (key: ConsentKey) => void;
};

const ConsentList = ({
  consents,
  isAllChecked,
  expandedKey,
  onToggleAll,
  onToggleItem,
  onToggleExpand,
}: ConsentListProps) => {
  return (
    <div className="flex w-full max-w-full flex-col gap-[17px]">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded px-1 py-1 text-left"
        onClick={onToggleAll}
      >
        <ConsentCheckboxControl checked={isAllChecked} />
        <span
          id="login-privacy-consent-title"
          className="text-mono-jet text-sm leading-5 font-bold"
        >
          전체동의
        </span>
      </button>

      <ConsentItemList
        consents={consents}
        expandedKey={expandedKey}
        onToggleItem={onToggleItem}
        onToggleExpand={onToggleExpand}
      />
    </div>
  );
};

type ConsentItemListProps = {
  consents: Record<ConsentKey, boolean>;
  expandedKey: ConsentKey | null;
  onToggleItem: (key: ConsentKey) => void;
  onToggleExpand: (key: ConsentKey) => void;
};

const ConsentItemList = ({
  consents,
  expandedKey,
  onToggleItem,
  onToggleExpand,
}: ConsentItemListProps) => {
  return (
    <div className="flex w-full flex-col gap-1">
      {CONSENT_ITEMS.map((item) => (
        <ConsentItemRow
          key={item.key}
          item={item}
          checked={consents[item.key]}
          isExpanded={expandedKey === item.key}
          onToggleItem={onToggleItem}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  );
};

type ConsentItemRowProps = {
  item: ConsentItem;
  checked: boolean;
  isExpanded: boolean;
  onToggleItem: (key: ConsentKey) => void;
  onToggleExpand: (key: ConsentKey) => void;
};

const ConsentItemRow = ({
  item,
  checked,
  isExpanded,
  onToggleItem,
  onToggleExpand,
}: ConsentItemRowProps) => {
  const hasDetailContent = Boolean(item.detailContent);
  const detailPanelId = `login-privacy-consent-detail-${item.key}`;

  const handleToggleConsent = () => {
    onToggleItem(item.key);
  };

  const handleToggleExpand = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!hasDetailContent) {
      return;
    }
    onToggleExpand(item.key);
  };

  return (
    <div className="flex w-full flex-col gap-2 px-1 py-1">
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded text-left"
          onClick={handleToggleConsent}
        >
          <ConsentCheckboxControl checked={checked} />
          <span className="text-mono-dark-gray min-w-0 flex-1 text-sm leading-5 font-bold">
            {item.label}
          </span>
        </button>
        {item.showChevron ? (
          <button
            type="button"
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded',
              hasDetailContent
                ? 'text-mono-dark-gray'
                : 'text-mono-dark-gray/40 cursor-default',
            )}
            onClick={handleToggleExpand}
            aria-expanded={hasDetailContent ? isExpanded : undefined}
            aria-controls={hasDetailContent ? detailPanelId : undefined}
            aria-label={`${item.label} 내용 ${isExpanded ? '접기' : '펼치기'}`}
            disabled={!hasDetailContent}
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                isExpanded ? 'rotate-180' : 'rotate-0',
              )}
              aria-hidden
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" aria-hidden />
        )}
      </div>
      {hasDetailContent && isExpanded ? (
        <div
          id={detailPanelId}
          className={cn(SCROLLABLE_PANEL_CLASSNAME, 'max-h-[226px]')}
          onTouchMove={handleScrollPointerGuard}
          onWheel={handleScrollPointerGuard}
        >
          {item.detailContent}
        </div>
      ) : null}
    </div>
  );
};

type ModalOverlayProps = {
  children: React.ReactNode;
  onClose: () => void;
};

const ModalOverlay = ({ children, onClose }: ModalOverlayProps) => {
  const handleBackdropClose = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    onClose();
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex min-h-svh items-center justify-center bg-[rgba(22,22,24,0.45)] p-5"
      onClick={handleBackdropClose}
    >
      {children}
    </div>
  );
};

/**
 * Figma `포치 공유용` — 로그인 개인정보 동의 modal (node `1134:12679`).
 */
export const LoginPrivacyConsentModal = ({
  open,
  onOpenChange,
  onAgree,
  onCancelIncomplete,
}: LoginPrivacyConsentModalProps) => {
  const [mounted, setMounted] = React.useState(false);
  const [consents, setConsents] = React.useState(createEmptyConsentState);
  const [expandedKey, setExpandedKey] = React.useState<ConsentKey | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedKey(null);
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        window.setTimeout(() => {
          onOpenChange(false);
        }, 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const isAllChecked = React.useMemo(() => {
    return CONSENT_ITEMS.every((item) => consents[item.key]);
  }, [consents]);

  const isRequiredChecked = React.useMemo(() => {
    return REQUIRED_KEYS.every((key) => consents[key]);
  }, [consents]);

  const handleToggleAll = () => {
    const nextValue = !isAllChecked;
    setConsents({
      age: nextValue,
      terms: nextValue,
      eula: nextValue,
      privacy: nextValue,
      optional: nextValue,
    });
  };

  const handleToggleItem = (key: ConsentKey) => {
    setConsents((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleExpand = (key: ConsentKey) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  const closeModal = React.useCallback(() => {
    window.setTimeout(() => {
      onOpenChange(false);
    }, 0);
  }, [onOpenChange]);

  const handleCancel = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isRequiredChecked) {
      onCancelIncomplete?.();
    }
    closeModal();
  };

  const handleAgree = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isRequiredChecked) {
      return;
    }
    event.stopPropagation();
    onAgree();
    closeModal();
  };

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <ModalOverlay onClose={closeModal}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-privacy-consent-title"
        className="mx-auto flex max-h-[min(514px,calc(100svh-2.5rem))] min-h-0 w-full max-w-[339px] flex-col items-center gap-6 overflow-hidden rounded-[24px] bg-white px-8 py-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(SCROLLABLE_PANEL_CLASSNAME, 'w-full flex-1')}
          onTouchMove={handleScrollPointerGuard}
          onWheel={handleScrollPointerGuard}
        >
          <ConsentList
            consents={consents}
            isAllChecked={isAllChecked}
            expandedKey={expandedKey}
            onToggleAll={handleToggleAll}
            onToggleItem={handleToggleItem}
            onToggleExpand={handleToggleExpand}
          />
        </div>

        <div className="flex shrink-0 items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-mono-jet text-mono-white hover:bg-mono-jet/90 h-10 rounded-full px-6 text-base leading-5 font-bold transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleAgree}
            disabled={!isRequiredChecked}
            className="border-mono-gray text-mono-jet hover:bg-brand/90 h-10 rounded-full border bg-[#FF93DB] px-6 text-base leading-5 font-bold transition-colors disabled:cursor-not-allowed disabled:bg-white disabled:text-gray-400 disabled:opacity-100"
          >
            동의
          </button>
        </div>
      </div>
    </ModalOverlay>,
    document.body,
  );
};

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { useGetRandomNames } from '@/api/generated/pouch-name-controller/pouch-name-controller';
import Input from '@/components/common/Input/Input';
import { Header } from '@/components/layout/Header';
import { PouchDraftResumeModal } from '@/components/my-cosmetics/PouchDraftResumeModal';
import { PouchNextButton } from '@/components/my-cosmetics/PouchNextButton';
import {
  buildPouchItemsResumePath,
  clearPouchDraft,
  hasPouchDraft,
  readPouchDraft,
  savePouchDraft,
} from '@/lib/pouch-draft';
import {
  clearPendingPouchId,
  DRAFT_POUCH_ID,
  savePendingPouchName,
} from '@/lib/pouch-setup';
import { cn } from '@/lib/utils';

const POUCHY_SRC = '/figma/my/pouchy.svg';

function PouchCreateContent() {
  const router = useRouter();
  const [theme, setTheme] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isDraftModalResolved, setIsDraftModalResolved] = useState(false);

  const { data: randomNamesData } = useGetRandomNames();
  const suggestedThemes = useMemo(() => {
    const names = randomNamesData?.names ?? [];
    return names
      .map((entry) => entry.name?.trim())
      .filter((name): name is string => Boolean(name))
      .slice(0, 3);
  }, [randomNamesData?.names]);

  const trimmedTheme = theme.trim();
  const canProceed = trimmedTheme.length > 0;

  useEffect(() => {
    if (hasPouchDraft()) {
      setIsDraftModalOpen(true);
      return;
    }
    setIsDraftModalResolved(true);
  }, []);

  useEffect(() => {
    if (!isDraftModalResolved || !trimmedTheme) {
      return;
    }

    const existing = readPouchDraft();
    if (existing) {
      savePouchDraft({
        ...existing,
        pouchName: trimmedTheme,
      });
      return;
    }

    savePouchDraft({
      pouchName: trimmedTheme,
      step: 'select',
      selectedOrder: [],
      itemMemos: {},
      layers: [],
      nextZIndex: 1,
    });
  }, [isDraftModalResolved, trimmedTheme]);

  const handleStartFresh = () => {
    clearPouchDraft();
    setTheme('');
    setIsDraftModalOpen(false);
    setIsDraftModalResolved(true);
  };

  const handleResumeDraft = () => {
    const draft = readPouchDraft();
    setIsDraftModalOpen(false);
    setIsDraftModalResolved(true);
    if (!draft) {
      return;
    }
    savePendingPouchName(draft.pouchName.trim());
    router.push(buildPouchItemsResumePath(draft.pouchName));
  };

  const handleNext = () => {
    if (!canProceed) {
      return;
    }

    setIsSubmitting(true);
    clearPendingPouchId();
    savePendingPouchName(trimmedTheme);
    savePouchDraft({
      pouchName: trimmedTheme,
      step: 'select',
      selectedOrder: [],
      itemMemos: {},
      layers: [],
      nextZIndex: 1,
    });
    router.push(
      `/my-cosmetics/pouch/${DRAFT_POUCH_ID}/items?name=${encodeURIComponent(trimmedTheme)}&fresh=1`,
    );
    setIsSubmitting(false);
  };

  return (
    <div className="flex h-(--app-height) flex-col overflow-hidden bg-white">
      <PouchDraftResumeModal
        open={isDraftModalOpen}
        onStartFresh={handleStartFresh}
        onResume={handleResumeDraft}
      />
      <Header
        title="새 파우치 만들기"
        onBack={() => {
          router.push('/my-cosmetics');
        }}
        className="shrink-0 border-b border-zinc-100 pt-[var(--safe-area-top)]"
        right={
          <PouchNextButton
            isDisabled={!canProceed}
            isLoading={isSubmitting}
            onClick={handleNext}
          />
        }
      />

      <main className="flex min-h-0 flex-1 flex-col px-5 pb-[max(0.5rem,var(--safe-area-bottom))]">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Image
            src={POUCHY_SRC}
            alt=""
            width={400}
            height={500}
            className="h-auto max-h-[min(38vh,500px)] w-full max-w-[400px] object-contain"
            priority
          />
        </div>

        <div className="w-full max-w-[320px] shrink-0 space-y-4 self-center">
          <Input
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value);
            }}
            placeholder="파우치 테마를 적어주세요"
            className="border-mono-bright-gray text-mono-jet h-12 rounded border px-4 text-center text-sm"
          />

          {suggestedThemes.length > 0 ? (
            <div className="mb-20 flex max-w-[320px] flex-col items-center gap-2 py-2">
              <p className="text-[11px] text-[#FF60CA]">추천 테마</p>
              <div className="flex w-full flex-col gap-2">
                {suggestedThemes.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setTheme(label);
                    }}
                    className={cn(
                      'border-mono-bright-gray text-mono-jet h-12 w-full rounded border bg-white px-4 text-center text-sm',
                      theme === label && 'border-[#FF60CA] bg-[#FFF7FC]',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function PouchCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-(--app-height) items-center justify-center bg-white text-sm text-zinc-500">
          불러오는 중...
        </div>
      }
    >
      <PouchCreateContent />
    </Suspense>
  );
}

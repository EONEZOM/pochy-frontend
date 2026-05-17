'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { useGetPouchDetail } from '@/api/generated/pouch-controller/pouch-controller';
import { Header } from '@/components/layout/Header';
import {
  POUCH_ITEMS_SHEET_BOTTOM_OFFSET,
  POUCH_ITEMS_SHEET_SNAP_COLLAPSED,
} from '@/components/my-cosmetics/PouchItemsBottomSheet';
import { buildPouchSharePath } from '@/lib/pouch-setup';
import { cn } from '@/lib/utils';

type PouchDetailViewProps = {
  pouchId: number;
  pouchName: string;
  imageUrl: string | null;
};

export function PouchDetailView({
  pouchId,
  pouchName,
  imageUrl,
}: PouchDetailViewProps) {
  const router = useRouter();
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const { data, isLoading } = useGetPouchDetail(pouchId);

  const memoItems = useMemo(
    () =>
      (data?.result?.cosmetics ?? []).filter(
        (item) => (item.memo ?? '').trim().length > 0,
      ),
    [data?.result?.cosmetics],
  );

  const sheetHeight = isSheetExpanded
    ? `calc(var(--app-height) * 0.6)`
    : `calc(var(--app-height) * ${POUCH_ITEMS_SHEET_SNAP_COLLAPSED})`;

  return (
    <>
      <div className="relative flex h-(--app-height) w-full flex-col overflow-hidden bg-white">
        <Header
          title={pouchName}
          onBack={() => {
            router.push('/my-cosmetics');
          }}
          className="shrink-0 border-b border-zinc-100 pt-[var(--safe-area-top)]"
          rightIcons={[
            {
              kind: 'share',
              ariaLabel: '\uACF5\uC720\uD558\uAE30',
              onClick: () => {
                router.push(buildPouchSharePath(pouchId, pouchName));
              },
            },
          ]}
        />

        <div
          className="flex min-h-0 flex-1 items-center justify-center px-4 pt-2"
          style={{
            paddingBottom: `calc(${sheetHeight} + ${POUCH_ITEMS_SHEET_BOTTOM_OFFSET})`,
          }}
        >
          <div className="flex h-full w-full max-w-[320px] items-center justify-center">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={pouchName}
                className="h-auto max-h-full w-auto max-w-full object-contain"
              />
            ) : (
              <Image
                src="/figma/my/pouchy.svg"
                alt=""
                width={320}
                height={460}
                unoptimized
                className="h-auto max-h-full w-auto max-w-full object-contain opacity-70"
                priority
              />
            )}
          </div>
        </div>

        <div
          className="absolute inset-x-0 z-30 mx-auto flex w-full max-w-120 min-w-90 flex-col items-center"
          style={{ bottom: POUCH_ITEMS_SHEET_BOTTOM_OFFSET }}
        >
          <button
            type="button"
            className={cn(
              'border-mono-bright-gray text-mono-dark-gray mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
            )}
            aria-label={isSheetExpanded ? '\uC2DC\uD2B8 \uC811\uAE30' : '\uC2DC\uD2B8 \uD3BC\uCE58\uAE30'}
            aria-expanded={isSheetExpanded}
            onClick={() => {
              setIsSheetExpanded(!isSheetExpanded);
            }}
          >
            <ChevronDown
              className={cn(
                'size-7 transition-transform duration-300',
                isSheetExpanded && 'rotate-180',
              )}
            />
          </button>

          <section
            aria-label="\uD30C\uC6B0\uCE58 \uBA54\uBAA8"
            className="flex w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-4px_4px_rgba(0,0,0,0.1)] transition-[height] duration-300"
            style={{ height: sheetHeight }}
          >
            <div className="flex shrink-0 flex-col items-center pt-3 pb-2">
              <div className="bg-mono-bright-gray h-2 w-[120px] rounded-full opacity-50" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-8">
              {isLoading ? (
                <p className="text-mono-dark-gray py-8 text-center text-sm">
                  {'\uBD88\uB7EC\uC624\uB294 \uC911...'}
                </p>
              ) : memoItems.length === 0 ? (
                <p className="text-mono-dark-gray py-8 text-center text-sm">
                  {'\uBA54\uBAA8\uAC00 \uC5C6\uC5B4\uC694.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {memoItems.map((item) => (
                    <li
                      key={item.id ?? item.myCosmeticId}
                      className="rounded bg-[#F3F3F3] px-3 py-2"
                    >
                      <p className="text-mono-dark-gray mb-1 text-xs font-bold">
                        {item.brand || item.name}
                      </p>
                      <p className="text-[11px] leading-[150%] text-[#161618]">
                        {item.memo}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

type PouchCompleteViewProps = {
  pouchName: string;
  imageUrl: string | null;
};

export function PouchCompleteView({
  pouchName,
  imageUrl,
}: PouchCompleteViewProps) {
  const router = useRouter();

  return (
    <>
      <div className="flex h-(--app-height) flex-col overflow-hidden bg-white">
        <Header
          title={pouchName}
          className="shrink-0 border-b border-zinc-100 pt-[var(--safe-area-top)]"
          showBack={false}
        />

        <main className="flex min-h-0 flex-1 flex-col items-center px-5 pt-6 pb-8">
          <p className="text-mono-jet mb-6 text-center text-base font-bold">
            {'\uD30C\uC6B0\uCE58\uAC00 \uC644\uC131\uB418\uC5C8\uC5B4\uC694!'}
          </p>

          <div className="relative flex min-h-0 w-full max-w-[280px] flex-1 items-center justify-center">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={pouchName}
                className="max-h-[min(50vh,420px)] w-auto max-w-full object-contain"
              />
            ) : (
              <Image
                src="/figma/my/pouchy.svg"
                alt=""
                width={280}
                height={400}
                unoptimized
                className="h-auto max-h-full w-full object-contain opacity-60"
              />
            )}
          </div>

          <Button
            type="button"
            className="mt-6 h-12 w-full max-w-[320px] rounded-full bg-[#FF93DB] text-base font-bold text-[#161618] hover:bg-[#FF85D5]"
            onClick={() => {
              router.replace('/my-cosmetics');
            }}
          >
            {'\uD30C\uC6B0\uCE58 \uB9AC\uC2A4\uD2B8\uB85C \uB3CC\uC544\uAC00\uAE30'}
          </Button>
        </main>
      </div>
    </>
  );
}

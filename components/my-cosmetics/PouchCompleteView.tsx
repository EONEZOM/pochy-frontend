'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

const POUCH_COMPLETE_GRADIENT =
  'linear-gradient(180deg, rgba(255, 255, 255, 1) 31%, rgba(255, 198, 236, 1) 100%)';

type PouchCompleteViewProps = {
  pouchName: string;
  imageUrl: string | null;
};

export function PouchCompleteView({
  pouchName,
  imageUrl,
}: PouchCompleteViewProps) {
  const router = useRouter();

  const handleGoToList = () => {
    router.replace('/my-cosmetics');
  };

  return (
    <div className="flex h-(--app-height) flex-col overflow-hidden bg-white">
      <Header
        title={'파우치 완성'}
        onBack={handleGoToList}
        className="shrink-0 border-b border-zinc-100 pt-[var(--safe-area-top)]"
      />

      <main
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 pb-[max(2rem,var(--safe-area-bottom))]"
        style={{ background: POUCH_COMPLETE_GRADIENT }}
      >
        <div className="flex w-full max-w-[280px] flex-col items-center">
          <div className="mb-4 w-full text-center">
            <p className="text-base font-bold text-[#FF60CA]">{pouchName}</p>
            <p className="mt-1 text-sm leading-[1.5] text-[#FF60CA]">
              {'파우치가 완성되었어요!'}
            </p>
          </div>

          <div className="relative flex w-full items-center justify-center">
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
                className="h-auto max-h-[min(50vh,420px)] w-full object-contain opacity-60"
              />
            )}
          </div>
        </div>

        <Button
          type="button"
          className="mt-8 h-12 w-full max-w-[320px] rounded-full bg-[#FF93DB] text-base font-bold text-[#161618] hover:bg-[#FF85D5]"
          onClick={handleGoToList}
        >
          {'파우치 리스트로 돌아가기'}
        </Button>
      </main>
    </div>
  );
}

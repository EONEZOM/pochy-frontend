'use client';

import Image from 'next/image';
import Link from 'next/link';
import { User } from 'lucide-react';

import { resolveMediaUrl } from '@/lib/resolve-media-url';

/**
 * 홈 메인 리스트 상단 프로필·인사 (Figma 1:3210)
 * https://www.figma.com/design/ozRGHFE4rnqkqnikqCh7Pg/%ED%8F%AC%EC%B9%98-%EC%9E%84%EC%8B%9C?node-id=1-3210
 */
export type MainHomeListHeaderProps = {
  nickname?: string | null;
  profileUrl?: string | null;
  isLoading: boolean;
};

const isRenderableAvatarUrl = (url: string): boolean => {
  if (!url) {
    return false;
  }
  return url.startsWith('/') || /^https?:\/\//i.test(url);
};

export function MainHomeListHeader({
  nickname,
  profileUrl,
  isLoading,
}: MainHomeListHeaderProps) {
  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[360px] animate-pulse items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2 py-0.5">
          <div className="bg-mono-bright-gray h-3 w-16 rounded" />
          <div className="bg-mono-bright-gray h-5 w-40 max-w-full rounded" />
        </div>
        <div className="bg-mono-bright-gray size-12 shrink-0 rounded-full" />
      </div>
    );
  }

  const resolved = profileUrl ? resolveMediaUrl(profileUrl) : '';
  const showAvatar = isRenderableAvatarUrl(resolved);
  const displayName = nickname?.trim() ? nickname.trim() : '포치';

  return (
    <div className="mx-auto flex w-full max-w-[360px] items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-right text-xs leading-4 font-bold text-[#FF60CA]">
          반가워요 {displayName}님,
          <br />
          흩어져 있는 화장품을 포치에 모아봐요!
        </p>
      </div>
      <Link href="/profile" className="shrink-0" aria-label="마이페이지로 이동">
        <span className="border-mono-white bg-mono-bright-gray flex size-12 items-center justify-center overflow-hidden rounded-full border-2 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {showAvatar ? (
            <Image
              src={resolved}
              alt=""
              width={48}
              height={48}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <User
              className="text-mono-dark-gray size-6"
              strokeWidth={1.5}
              aria-hidden
            />
          )}
        </span>
      </Link>
    </div>
  );
}

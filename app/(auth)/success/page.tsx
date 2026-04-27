'use client';

import Image from 'next/image';
import Link from 'next/link';
import mainLogo from '@/public/logo/main-logo.png';

export default function AuthSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <h1 className="text-2xl font-bold text-zinc-900">로그인 완료</h1>
      <p className="mt-3 text-sm text-zinc-600">
        반가워요! 당신의 포치가 만들어졌어요.
      </p>
      <Image
        src={mainLogo}
        alt="main-logo"
        width={200}
        height={200}
        className="mx-auto mt-10 mb-10"
      />
      <Link
        href="/?setupNickname=1"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
      >
        메인으로 이동
      </Link>
    </main>
  );
}

import Link from 'next/link';

export default function AuthSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">로그인 완료</h1>
        <p className="mt-3 text-sm text-zinc-600">
          이메일 인증이 완료되어 로그인 상태가 되었습니다.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
        >
          메인으로 이동
        </Link>
      </div>
    </main>
  );
}

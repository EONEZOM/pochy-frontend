import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import RegisterPWA from '../workers/register-pwa';
import QueryProvider from '@/providers/query-provider';
import '@/styles/reset.css';
import '@/styles/globals.css';
import { BottomNav } from '@/components/layout/BottomNav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'POCHY | 나만의 화장대',
  description: '나만의 화장대를 만들고 공유해보세요!',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full justify-center overflow-x-hidden bg-zinc-50">
        <RegisterPWA />
        <QueryProvider>
          <div className="relative flex min-h-full w-full max-w-120 min-w-90 flex-col bg-white shadow-xl">
            <main
              vaul-drawer-wrapper=""
              className="flex min-h-0 flex-1 flex-col bg-white pb-14"
            >
              {children}
            </main>
            <BottomNav className="sticky bottom-0" />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}

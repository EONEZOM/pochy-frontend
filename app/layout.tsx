import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import RegisterPWA from '../workers/register-pwa';
import QueryProvider from '@/providers/query-provider';
import { BottomNavVisibilityProvider } from '@/providers/bottom-nav-visibility';
import ViewportHeightSync from '@/providers/viewport-height-sync';
import '@/styles/reset.css';
import '@/styles/globals.css';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppMain } from '@/components/layout/AppMain';
import { NavRouteDataPrefetch } from '@/components/layout/NavRouteDataPrefetch';

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
  applicationName: 'POCHY',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo/nobg-logo-192.svg',
    shortcut: '/logo/nobg-logo-192.svg',
    apple: '/logo/nobg-logo-192.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} min-h-(--app-height) antialiased`}
    >
      <body className="flex min-h-(--app-height) justify-center items-start overflow-x-hidden bg-zinc-50">
        <ViewportHeightSync />
        <RegisterPWA />
        <QueryProvider>
          <BottomNavVisibilityProvider>
            {/* vaul: bottom 시트의 기준을 뷰포트 하단에 맞추려면 main만 감싸면 안 됨(하단 내비 위에 붙는 현상). */}
            <div
              vaul-drawer-wrapper=""
              className="relative flex min-h-(--app-height) w-full max-w-120 min-w-90 flex-col bg-white shadow-xl"
            >
              <NavRouteDataPrefetch />
              <AppMain>{children}</AppMain>
              <BottomNav />
            </div>
          </BottomNavVisibilityProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

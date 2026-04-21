import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import RegisterPWA from '../workers/register-pwa'
import QueryProvider from '@/providers/query-provider'
import '@/styles/reset.css'
import '@/styles/globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PouChy | 나만의 화장대',
  description: '나만의 화장대를 만들어보세요',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col items-center">
        <RegisterPWA />
        <QueryProvider>
          <div className="w-full max-w-120 bg-white">{children}</div>
        </QueryProvider>
      </body>
    </html>
  )
}

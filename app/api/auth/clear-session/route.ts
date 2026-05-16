import { NextRequest, NextResponse } from 'next/server';

import { clearRefreshTokenCookie } from '@/lib/auth-cookie';

/** httpOnly REFRESH_TOKEN 쿠키를 제거합니다. */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearRefreshTokenCookie(response, request);
  return response;
}

import { NextRequest, NextResponse } from 'next/server';

import { REFRESH_TOKEN_COOKIE_KEY } from '@/lib/auth-cookie';

/** REFRESH_TOKEN 쿠키 존재 여부만 확인 (백엔드 reissue 호출 없음). */
export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_KEY)?.value;

  if (!refreshToken?.trim()) {
    return new NextResponse(null, { status: 401 });
  }

  return new NextResponse(null, { status: 204 });
}

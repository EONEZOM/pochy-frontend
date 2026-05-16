import { NextRequest, NextResponse } from 'next/server';

import {
  ACCESS_TOKEN_COOKIE_KEY,
  REFRESH_TOKEN_COOKIE_KEY,
} from '@/lib/auth-cookie';

/** REFRESH_TOKEN 또는 ACCESS_TOKEN 쿠키 존재 여부만 확인 (백엔드 reissue 호출 없음). */
export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_KEY)?.value;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_KEY)?.value;

  const hasRefresh = Boolean(refreshToken?.trim());
  const hasAccess = Boolean(accessToken?.trim());

  if (!hasRefresh && !hasAccess) {
    return new NextResponse(null, { status: 401 });
  }

  return new NextResponse(null, { status: 204 });
}

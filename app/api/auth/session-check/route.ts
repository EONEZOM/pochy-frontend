import { NextRequest, NextResponse } from 'next/server';

import {
  ACCESS_TOKEN_COOKIE_KEY,
  REFRESH_TOKEN_COOKIE_KEY,
} from '@/lib/auth-cookie';
import { agentDebugLogServer } from '@/lib/debug-agent-log-server';

/** REFRESH_TOKEN 쿠키 존재 여부만 확인 (백엔드 reissue 호출 없음). */
export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_KEY)?.value;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_KEY)?.value;

  // #region agent log
  agentDebugLogServer({
    hypothesisId: 'H1',
    location: 'session-check/route.ts:GET',
    message: 'session-check cookies',
    data: {
      hasRefresh: Boolean(refreshToken?.trim()),
      hasAccess: Boolean(accessToken?.trim()),
      refreshLen: refreshToken?.length ?? 0,
      accessLen: accessToken?.length ?? 0,
      referer: request.headers.get('referer'),
    },
  });
  // #endregion

  const hasRefresh = Boolean(refreshToken?.trim());
  const hasAccess = Boolean(accessToken?.trim());

  if (!hasRefresh && !hasAccess) {
    return new NextResponse(null, { status: 401 });
  }

  return new NextResponse(null, { status: 204 });
}

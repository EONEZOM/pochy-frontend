import { NextRequest, NextResponse } from 'next/server';

import {
  applyRefreshTokenCookie,
  clearRefreshTokenCookie,
  extractRefreshTokenFromPayload,
  REFRESH_TOKEN_COOKIE_KEY,
} from '@/lib/auth-cookie';
import { REISSUE_ERROR_CODE } from '@/lib/reissue-error';
import { getServerApiBase } from '@/lib/server-api-base';

export async function POST(request: NextRequest) {
  const apiBase = getServerApiBase();
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_KEY)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      {
        success: false,
        code: REISSUE_ERROR_CODE.REFRESH_MISSING,
        message: 'Refresh token not found',
      },
      { status: 401 },
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${apiBase}/api/auth/reissue`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Cookie: `${REFRESH_TOKEN_COOKIE_KEY}=${refreshToken}`,
      },
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[api/auth/reissue] backend request failed', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Reissue request failed',
      },
      { status: 502 },
    );
  }

  if (!backendRes.ok) {
    const errorBody = await backendRes.text().catch(() => '');
    const response = NextResponse.json(
      {
        success: false,
        code: REISSUE_ERROR_CODE.REFRESH_INVALID,
        message: 'Refresh token rejected',
        detail: errorBody || undefined,
      },
      { status: backendRes.status },
    );
    clearRefreshTokenCookie(response, request);
    return response;
  }

  const responseBody = await backendRes.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      'Content-Type':
        backendRes.headers.get('content-type') ?? 'application/json',
    },
  });

  const authorization = backendRes.headers.get('authorization');
  if (authorization) {
    response.headers.set('authorization', authorization);
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(new TextDecoder().decode(responseBody));
  } catch {
    payload = null;
  }

  const nextRefreshToken = extractRefreshTokenFromPayload(payload);

  if (nextRefreshToken) {
    applyRefreshTokenCookie(response, nextRefreshToken, request);
  } else {
    applyRefreshTokenCookie(response, refreshToken, request);
  }

  return response;
}

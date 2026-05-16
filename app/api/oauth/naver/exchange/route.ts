import { NextRequest, NextResponse } from 'next/server';

import {
  applyRefreshTokenCookie,
  extractAccessTokenFromPayload,
  extractBearerTokenFromAuthorizationHeader,
  extractEmailFromPayload,
  extractNicknameFromPayload,
  extractRefreshTokenFromPayload,
  extractRefreshTokenFromSetCookieHeader,
} from '@/lib/auth-cookie';

/**
 * 네이버 OAuth는 TokenDto(access만)로 내려와 refresh가 브라우저 쿠키에 안 붙습니다.
 * getState()와 동일하게 동일 오리진 /api 프록시 + 브라우저 Cookie를 전달해 교환합니다.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  const state = request.nextUrl.searchParams.get('state')?.trim() ?? '';

  if (!code || !state) {
    return NextResponse.json(
      { ok: false, error: 'missing_params' },
      { status: 400 },
    );
  }

  const exchangeUrl = new URL('/api/login/oauth2/naver', request.nextUrl.origin);
  exchangeUrl.searchParams.set('code', code);
  exchangeUrl.searchParams.set('state', state);

  const cookieHeader = request.headers.get('cookie');

  let backendRes: Response;
  try {
    backendRes = await fetch(exchangeUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Origin: request.nextUrl.origin,
        Referer: request.url,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });
  } catch (error) {
    console.error('[api/oauth/naver/exchange] backend request failed', error);
    return NextResponse.json(
      { ok: false, error: 'exchange_failed' },
      { status: 502 },
    );
  }

  if (!backendRes.ok) {
    const detail = await backendRes.text().catch(() => '');
    return NextResponse.json(
      { ok: false, error: 'exchange_rejected', detail: detail || undefined },
      { status: backendRes.status },
    );
  }

  let payload: unknown = null;
  try {
    payload = await backendRes.json();
  } catch {
    payload = null;
  }

  const refreshFromBody = extractRefreshTokenFromPayload(payload);
  const refreshFromSetCookie =
    extractRefreshTokenFromSetCookieHeader(backendRes.headers);
  const bearerFromHeader = extractBearerTokenFromAuthorizationHeader(
    backendRes.headers,
  );
  const refreshToken =
    refreshFromBody ??
    refreshFromSetCookie ??
    extractRefreshTokenFromPayload(bearerFromHeader);

  const accessToken =
    extractAccessTokenFromPayload(payload) ??
    extractAccessTokenFromPayload(bearerFromHeader) ??
    bearerFromHeader;

  const nickname = extractNicknameFromPayload(payload);
  const email = extractEmailFromPayload(payload);

  if (!refreshToken) {
    console.warn('[api/oauth/naver/exchange] missing refresh token', {
      status: backendRes.status,
    });
    return NextResponse.json(
      { ok: false, error: 'missing_refresh' },
      { status: 502 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    accessToken: accessToken ?? null,
    nickname: nickname ?? null,
    email: email ?? null,
  });
  applyRefreshTokenCookie(response, refreshToken, request);

  return response;
}

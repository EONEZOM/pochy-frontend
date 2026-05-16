import { NextRequest, NextResponse } from 'next/server';

import {
  applyRefreshTokenCookie,
  extractAccessTokenFromPayload,
  extractNicknameFromPayload,
  extractRefreshTokenFromPayload,
  extractRefreshTokenFromSetCookieHeader,
} from '@/lib/auth-cookie';
import { getServerApiBase } from '@/lib/server-api-base';

/**
 * 네이버 OAuth는 TokenDto(access만)로 내려와 refresh가 브라우저 쿠키에 안 붙습니다.
 * 서버에서 백엔드와 교환한 뒤 REFRESH_TOKEN 쿠키를 프론트 도메인에 설정합니다.
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

  const apiBase = getServerApiBase();
  if (!apiBase) {
    return NextResponse.json(
      { ok: false, error: 'config' },
      { status: 500 },
    );
  }

  const exchangeUrl = new URL(`${apiBase}/api/login/oauth2/naver`);
  exchangeUrl.searchParams.set('code', code);
  exchangeUrl.searchParams.set('state', state);

  let backendRes: Response;
  try {
    backendRes = await fetch(exchangeUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Origin: request.nextUrl.origin,
        Referer: request.url,
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
  const refreshToken = refreshFromBody ?? refreshFromSetCookie;
  const accessToken = extractAccessTokenFromPayload(payload);
  const nickname = extractNicknameFromPayload(payload);

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
  });
  applyRefreshTokenCookie(response, refreshToken, request);

  return response;
}

import { NextRequest, NextResponse } from 'next/server';

import {
  applyRefreshTokenCookie,
  extractNewMemberFromPayload,
  extractNicknameFromPayload,
  extractRefreshTokenFromPayload,
  extractRefreshTokenFromSetCookieHeader,
  REFRESH_TOKEN_COOKIE_KEY,
} from '@/lib/auth-cookie';
import {
  applyPendingNicknameSetupCookie,
  shouldMarkPendingNicknameSetup,
} from '@/lib/pending-nickname-setup';
import { hasUsableServerNickname } from '@/lib/is-withdrawn-member';
import { getServerApiBase } from '@/lib/server-api-base';

const API_BASE = getServerApiBase();
const AUTH_COOKIE_KEYS = [REFRESH_TOKEN_COOKIE_KEY];
const OPENING_SEEN_COOKIE_KEY = 'OPENING_SEEN';

/**
 * 메일의 매직 링크가 /api/auth/verify-magic-link?token=... 형태이면
 * next.config rewrites에 의해 백엔드로만 가고 화면 전환이 끊깁니다.
 * 이 경로는 미들웨어에서 먼저 처리해 /success로 보내고,
 * 토큰은 localhost에 맞는 쿠키 속성으로만 저장합니다.
 */

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    const hasSeenOpening =
      request.cookies.get(OPENING_SEEN_COOKIE_KEY)?.value === '1';
    const hasSessionCookie = AUTH_COOKIE_KEYS.some((key) =>
      Boolean(request.cookies.get(key)?.value),
    );

    if (!hasSeenOpening || !hasSessionCookie) {
      return NextResponse.redirect(new URL('/opening', request.url));
    }
  }

  if (request.nextUrl.pathname !== '/api/auth/verify-magic-link') {
    return NextResponse.next();
  }

  if (request.method === 'HEAD') {
    return NextResponse.next();
  }

  if (request.method !== 'GET') {
    return NextResponse.next();
  }

  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/verify?error=missing', request.url));
  }

  if (!API_BASE) {
    console.error('[middleware][verify] API_BASE missing');
    return NextResponse.redirect(new URL('/verify?error=config', request.url));
  }

  const verifyUrl = `${API_BASE}/api/auth/verify-magic-link?token=${encodeURIComponent(token)}`;
  console.info('[middleware][verify] start', {
    verifyUrl,
    tokenLength: token.length,
  });
  let backendRes: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    backendRes = await fetch(verifyUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Origin: request.nextUrl.origin,
        Referer: request.url,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
    });
  } catch (error) {
    console.error('Backend verification failed:', error);
    const isTimeout =
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: string }).name === 'AbortError';

    return NextResponse.redirect(
      new URL(`/verify?error=${isTimeout ? 'timeout' : 'config'}`, request.url),
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!backendRes.ok) {
    const errorBody = await backendRes.text().catch(() => 'No body');
    const responseHeaders = Object.fromEntries(backendRes.headers.entries());
    console.warn('[middleware][verify] backend non-2xx', {
      status: backendRes.status,
      verifyUrl,
      errorBody,
      responseHeaders,
    });

    return NextResponse.redirect(
      new URL(`/verify?error=invalid&status=${backendRes.status}`, request.url),
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

  if (!refreshToken) {
    console.warn('[middleware][verify] missing refresh token in response', {
      status: backendRes.status,
    });
    return NextResponse.redirect(
      new URL(
        `/verify?error=cookie_missing&status=${backendRes.status}`,
        request.url,
      ),
    );
  }

  const redirect = NextResponse.redirect(new URL('/success', request.url));
  applyRefreshTokenCookie(redirect, refreshToken, request);

  const newMember = extractNewMemberFromPayload(payload);
  const verifyNickname = extractNicknameFromPayload(payload);
  if (
    shouldMarkPendingNicknameSetup(
      newMember,
      hasUsableServerNickname(verifyNickname),
    )
  ) {
    applyPendingNicknameSetupCookie(redirect, request, newMember === true);
  }

  console.info('[middleware][verify] success', {
    status: backendRes.status,
  });

  return redirect;
}

export const config = {
  matcher: ['/', '/api/auth/verify-magic-link'],
};

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
import { getServerApiBase } from '@/lib/server-api-base';

type NaverExchangeTokens = {
  refreshToken: string | null;
  accessToken: string | null;
  nickname: string | null;
  email: string | null;
};

const extractTokensFromResponse = async (
  backendRes: Response,
): Promise<{ tokens: NaverExchangeTokens; payload: unknown }> => {
  let payload: unknown = null;
  const rawBody = await backendRes.text();
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
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

  return {
    payload,
    tokens: {
      refreshToken,
      accessToken,
      nickname: extractNicknameFromPayload(payload),
      email: extractEmailFromPayload(payload),
    },
  };
};

const fetchNaverLoginViaProxy = async (
  request: NextRequest,
  code: string,
  state: string,
): Promise<Response> => {
  const exchangeUrl = new URL('/api/login/oauth2/naver', request.nextUrl.origin);
  exchangeUrl.searchParams.set('code', code);
  exchangeUrl.searchParams.set('state', state);

  const cookieHeader = request.headers.get('cookie');

  return fetch(exchangeUrl.toString(), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json, text/plain, */*',
      Origin: request.nextUrl.origin,
      Referer: request.url,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });
};

const fetchNaverLoginViaApiBase = async (
  request: NextRequest,
  code: string,
  state: string,
): Promise<Response> => {
  const apiBase = getServerApiBase();
  const exchangeUrl = new URL(`${apiBase}/api/login/oauth2/naver`);
  exchangeUrl.searchParams.set('code', code);
  exchangeUrl.searchParams.set('state', state);

  const cookieHeader = request.headers.get('cookie');

  return fetch(exchangeUrl.toString(), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json, text/plain, */*',
      Origin: request.nextUrl.origin,
      Referer: request.url,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });
};

/**
 * 네이버 OAuth는 TokenDto(access만)로 내려와 refresh가 Set-Cookie에만 있을 수 있습니다.
 * 1) 동일 오리진 프록시 + 브라우저 Cookie (state 세션)
 * 2) 실패 시 apiBase 직접 호출 (Vercel self-fetch Set-Cookie 유실 보완)
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

  const attempts: Array<{
    label: string;
    fetcher: () => Promise<Response>;
  }> = [
    { label: 'proxy', fetcher: () => fetchNaverLoginViaProxy(request, code, state) },
    { label: 'apiBase', fetcher: () => fetchNaverLoginViaApiBase(request, code, state) },
  ];

  let lastErrorStatus = 502;
  let lastErrorDetail: string | undefined;

  for (const attempt of attempts) {
    let backendRes: Response;
    try {
      backendRes = await attempt.fetcher();
    } catch (error) {
      console.error(
        `[api/oauth/naver/exchange] ${attempt.label} request failed`,
        error,
      );
      continue;
    }

    if (!backendRes.ok) {
      lastErrorStatus = backendRes.status;
      lastErrorDetail = await backendRes.text().catch(() => '');
      console.warn(`[api/oauth/naver/exchange] ${attempt.label} non-2xx`, {
        status: backendRes.status,
        detail: lastErrorDetail,
      });
      continue;
    }

    const { tokens } = await extractTokensFromResponse(backendRes);

    if (!tokens.refreshToken) {
      console.warn(
        `[api/oauth/naver/exchange] ${attempt.label} missing refresh token`,
        { status: backendRes.status },
      );
      continue;
    }

    const response = NextResponse.json({
      ok: true,
      accessToken: tokens.accessToken ?? null,
      nickname: tokens.nickname ?? null,
      email: tokens.email ?? null,
    });
    applyRefreshTokenCookie(response, tokens.refreshToken, request);

    return response;
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'missing_refresh',
      detail: lastErrorDetail || undefined,
    },
    { status: lastErrorStatus === 502 ? 502 : lastErrorStatus },
  );
}

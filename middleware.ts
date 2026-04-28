import { NextRequest, NextResponse } from 'next/server';

const normalizeApiBase = (value?: string) => {
  if (!value) {
    return '';
  }
  return value.replace(/\/$/, '').replace(/\/v3\/api-docs$/, '').replace(/\/api$/, '');
};

const runtimeApiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
const openApiBase = normalizeApiBase(process.env.OPENAPI_BASE_URL);
const API_BASE = runtimeApiBase || openApiBase || '';
const AUTH_COOKIE_KEYS = ['REFRESH_TOKEN'];
const ACCESS_TOKEN_COOKIE_KEY = 'ACCESS_TOKEN';
const REFRESH_TOKEN_COOKIE_KEY = 'REFRESH_TOKEN';

const extractToken = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = ['accessToken', 'refreshToken', 'access_token', 'refresh_token', 'token'];
  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(record)) {
    const nested = extractToken(nestedValue);
    if (nested) {
      return nested;
    }
  }

  return null;
};

/**
 * 메일의 매직 링크가 /api/auth/verify-magic-link?token=... 형태이면
 * next.config rewrites에 의해 백엔드로만 가고 화면 전환이 끊깁니다.
 * 이 경로는 미들웨어에서 먼저 처리해 /success로 보내고,
 * 백엔드가 내려주는 Set-Cookie는 응답에 그대로 붙여 브라우저 세션이 유지되게 합니다.
 */

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    const hasSessionCookie = AUTH_COOKIE_KEYS.some(
      (key) => Boolean(request.cookies.get(key)?.value),
    );
    if (!hasSessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
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

  const isConfirmed = request.nextUrl.searchParams.get('confirm') === '1';
  const isDirectUserNavigation = request.headers.get('sec-fetch-user') === '?1';
  if (!isConfirmed && !isDirectUserNavigation) {
    const verifyPageUrl = new URL('/verify', request.url);
    verifyPageUrl.searchParams.set('token', token);
    return NextResponse.redirect(verifyPageUrl);
  }

  if (!API_BASE) {
    return NextResponse.redirect(new URL('/verify?error=config', request.url));
  }

  const verifyUrl = `${API_BASE}/api/auth/verify-magic-link?token=${encodeURIComponent(token)}`;
  let backendRes: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    backendRes = await fetch(verifyUrl, { method: 'GET', signal: controller.signal });
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
    return NextResponse.redirect(
      new URL(`/verify?error=invalid&status=${backendRes.status}`, request.url),
    );
  }

  const redirect = NextResponse.redirect(new URL('/success', request.url));

  const withGetSetCookie = backendRes.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = withGetSetCookie.getSetCookie?.() ?? [];
  for (const c of cookies) {
    redirect.headers.append('Set-Cookie', c);
  }
  let appendedCookieCount = cookies.length;
  if (cookies.length === 0) {
    const one = backendRes.headers.get('set-cookie');
    if (one) {
      redirect.headers.append('Set-Cookie', one);
      appendedCookieCount = 1;
    }
  }

  // 개발용 진단: verify 성공(200)이어도 세션 쿠키가 없으면 로그인 상태를 만들 수 없음
  if (appendedCookieCount === 0) {
    let payload: unknown = null;
    try {
      payload = await backendRes.clone().json();
    } catch {
      payload = null;
    }

    const payloadRecord =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : null;
    const resultValue = payloadRecord?.result;

    const accessToken = extractToken(
      typeof resultValue === 'object' && resultValue !== null
        ? (resultValue as Record<string, unknown>).accessToken
        : null,
    );
    const refreshToken = extractToken(
      typeof resultValue === 'object' && resultValue !== null
        ? (resultValue as Record<string, unknown>).refreshToken
        : null,
    );

    if (!refreshToken) {
      return NextResponse.redirect(
        new URL(
          `/verify?error=cookie_missing&status=${backendRes.status}`,
          request.url,
        ),
      );
    }

    const isSecure = request.nextUrl.protocol === 'https:';
    redirect.cookies.set({
      name: REFRESH_TOKEN_COOKIE_KEY,
      value: refreshToken,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
    });
    if (accessToken) {
      redirect.cookies.set({
        name: ACCESS_TOKEN_COOKIE_KEY,
        value: accessToken,
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: isSecure,
      });
    }
  }

  return redirect;
}

export const config = {
  matcher: ['/', '/api/auth/verify-magic-link'],
};

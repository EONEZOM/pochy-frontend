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

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next();
  }

  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/verify?error=missing', request.url));
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
    return NextResponse.redirect(
      new URL(
        `/verify?error=cookie_missing&status=${backendRes.status}`,
        request.url,
      ),
    );
  }

  return redirect;
}

export const config = {
  matcher: ['/', '/api/auth/verify-magic-link'],
};

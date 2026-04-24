import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.OPENAPI_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  '';

/**
 * 메일의 매직 링크가 /api/auth/verify-magic-link?token=... 형태이면
 * next.config rewrites에 의해 백엔드로만 가고 화면 전환이 끊깁니다.
 * 이 경로는 미들웨어에서 먼저 처리해 /success로 보내고,
 * 백엔드가 내려주는 Set-Cookie는 응답에 그대로 붙여 브라우저 세션이 유지되게 합니다.
 */

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    const hasSessionCookie = request.cookies.getAll().length > 0;
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
  try {
    backendRes = await fetch(verifyUrl, { method: 'GET' });
  } catch (error) {
    console.error('Backend verification failed:', error);
    return NextResponse.redirect(new URL('/verify?error=config', request.url));
  }

  if (!backendRes.ok) {
    return NextResponse.redirect(new URL('/verify?error=invalid', request.url));
  }

  const redirect = NextResponse.redirect(new URL('/success', request.url));

  const withGetSetCookie = backendRes.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = withGetSetCookie.getSetCookie?.() ?? [];
  for (const c of cookies) {
    redirect.headers.append('Set-Cookie', c);
  }
  if (cookies.length === 0) {
    const one = backendRes.headers.get('set-cookie');
    if (one) {
      redirect.headers.append('Set-Cookie', one);
    }
  }

  return redirect;
}

export const config = {
  matcher: ['/', '/api/auth/verify-magic-link'],
};

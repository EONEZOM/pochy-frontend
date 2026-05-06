import { NextRequest, NextResponse } from 'next/server';

const REFRESH_TOKEN_COOKIE_KEY = 'REFRESH_TOKEN';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const record =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : null;
  const refreshToken =
    typeof record?.refreshToken === 'string' ? record.refreshToken.trim() : '';

  if (!refreshToken) {
    return NextResponse.json(
      { ok: false, error: 'missing_refresh_token' },
      { status: 400 },
    );
  }

  const isSecure = request.nextUrl.protocol === 'https:';
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: REFRESH_TOKEN_COOKIE_KEY,
    value: refreshToken,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}

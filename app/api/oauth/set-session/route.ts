import { NextRequest, NextResponse } from 'next/server';

import { applyRefreshTokenCookie } from '@/lib/auth-cookie';

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

  const res = NextResponse.json({ ok: true });
  applyRefreshTokenCookie(res, refreshToken, request);

  return res;
}

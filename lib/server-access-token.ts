import type { NextRequest } from 'next/server';

import {
  ACCESS_TOKEN_COOKIE_KEY,
  REFRESH_TOKEN_COOKIE_KEY,
  extractAccessTokenFromPayload,
  extractBearerTokenFromAuthorizationHeader,
} from '@/lib/auth-cookie';
import { getServerApiBase } from '@/lib/server-api-base';

/** Route Handler에서 Bearer 액세스 토큰을 해석합니다 (헤더 → 쿠키 → reissue). */
export const resolveServerAccessToken = async (
  request: NextRequest,
): Promise<string | null> => {
  const fromHeader = extractBearerTokenFromAuthorizationHeader(request.headers);
  if (fromHeader) {
    return fromHeader;
  }

  const accessFromCookie = request.cookies
    .get(ACCESS_TOKEN_COOKIE_KEY)
    ?.value?.trim();
  if (accessFromCookie) {
    return accessFromCookie;
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_KEY)?.value;
  if (!refreshToken) {
    return null;
  }

  const apiBase = getServerApiBase();
  let reissueRes: Response;
  try {
    reissueRes = await fetch(`${apiBase}/api/auth/reissue`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Cookie: `${REFRESH_TOKEN_COOKIE_KEY}=${refreshToken}`,
      },
      cache: 'no-store',
    });
  } catch {
    return null;
  }

  if (!reissueRes.ok) {
    return null;
  }

  const fromReissueHeader = extractBearerTokenFromAuthorizationHeader(
    reissueRes.headers,
  );
  if (fromReissueHeader) {
    return fromReissueHeader;
  }

  try {
    const payload: unknown = await reissueRes.json();
    return extractAccessTokenFromPayload(payload);
  } catch {
    return null;
  }
};

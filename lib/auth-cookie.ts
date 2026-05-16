import type { NextRequest, NextResponse } from 'next/server';

export const REFRESH_TOKEN_COOKIE_KEY = 'REFRESH_TOKEN';
export const ACCESS_TOKEN_COOKIE_KEY = 'ACCESS_TOKEN';

const REFRESH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

const isSecureRequest = (request: NextRequest): boolean => {
  return request.nextUrl.protocol === 'https:';
};

/** localhost·프록시 BFF에 맞는 REFRESH_TOKEN 쿠키 (SameSite=Lax, http에서는 Secure 없음) */
export const applyRefreshTokenCookie = (
  response: NextResponse,
  refreshToken: string,
  request: NextRequest,
): void => {
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_KEY,
    value: refreshToken,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(request),
    maxAge: REFRESH_COOKIE_MAX_AGE_SEC,
  });
};

export const applyAccessTokenCookie = (
  response: NextResponse,
  accessToken: string,
  request: NextRequest,
): void => {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_KEY,
    value: accessToken,
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: isSecureRequest(request),
    maxAge: REFRESH_COOKIE_MAX_AGE_SEC,
  });
};

export const clearRefreshTokenCookie = (
  response: NextResponse,
  request: NextRequest,
): void => {
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_KEY,
    value: '',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(request),
    maxAge: 0,
  });
};

/** ApiResponseDTO 메타 필드 — 재귀 탐색 시 토큰으로 오인하지 않습니다. */
const PAYLOAD_META_KEYS = new Set([
  'code',
  'message',
  'success',
  'status',
  'detail',
  'error',
]);

const extractNamedToken = (
  value: unknown,
  keys: string[],
  depth = 0,
): string | null => {
  if (depth > 6 || value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return depth === 0 && value.trim().length > 0 ? value.trim() : null;
  }

  if (typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const [key, nestedValue] of Object.entries(record)) {
    if (PAYLOAD_META_KEYS.has(key)) {
      continue;
    }
    const nested = extractNamedToken(nestedValue, keys, depth + 1);
    if (nested) {
      return nested;
    }
  }

  return null;
};

export const extractRefreshTokenFromPayload = (value: unknown): string | null => {
  return extractNamedToken(value, ['refreshToken', 'refresh_token']);
};

const REFRESH_COOKIE_NAME_PATTERN =
  /(?:^|[;,]\s*)(?:REFRESH_TOKEN|refreshToken|refresh_token)=([^;]+)/i;

/** 백엔드 verify·reissue 응답의 Set-Cookie에서 refresh 토큰을 읽습니다. */
export const extractRefreshTokenFromSetCookieHeader = (
  headers: Headers,
): string | null => {
  const headerWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookieList =
    typeof headerWithGetSetCookie.getSetCookie === 'function'
      ? headerWithGetSetCookie.getSetCookie()
      : [];

  const fallback = headers.get('set-cookie');
  const rawCookies =
    setCookieList.length > 0 ? setCookieList : fallback ? [fallback] : [];

  for (const raw of rawCookies) {
    const match = raw.match(REFRESH_COOKIE_NAME_PATTERN);
    const value = match?.[1]?.trim();
    if (!value) {
      continue;
    }
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
};

export const extractAccessTokenFromPayload = (value: unknown): string | null => {
  return extractNamedToken(value, ['accessToken', 'access_token', 'token']);
};

/** 백엔드 응답 Authorization 헤더에서 Bearer 토큰을 읽습니다. */
export const extractBearerTokenFromAuthorizationHeader = (
  headers: Headers,
): string | null => {
  const authorization = headers.get('authorization');
  if (!authorization?.trim()) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
};

export const extractNicknameFromPayload = (value: unknown): string | null => {
  return extractNamedToken(value, ['nickname']);
};

export const extractEmailFromPayload = (value: unknown): string | null => {
  return extractNamedToken(value, ['email']);
};

/** 없음(undefined)은 미전달, false만 기존 회원 로그인으로 간주 */
export const extractNewMemberFromPayload = (
  value: unknown,
): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const direct = record.newMember ?? record.new_member;
  if (typeof direct === 'boolean') {
    return direct;
  }
  if (direct === 'true' || direct === 1) {
    return true;
  }
  if (direct === 'false' || direct === 0) {
    return false;
  }

  let hasTrue = false;
  let hasFalse = false;
  for (const [key, nestedValue] of Object.entries(record)) {
    if (PAYLOAD_META_KEYS.has(key)) {
      continue;
    }
    const nested = extractNewMemberFromPayload(nestedValue);
    if (nested === true) {
      hasTrue = true;
    }
    if (nested === false) {
      hasFalse = true;
    }
  }

  if (hasTrue) {
    return true;
  }
  if (hasFalse) {
    return false;
  }

  return undefined;
};

/** reissue 응답 등 토큰 종류가 하나뿐일 때 사용 */
export const extractTokenFromPayload = (value: unknown): string | null => {
  return (
    extractAccessTokenFromPayload(value) ??
    extractRefreshTokenFromPayload(value)
  );
};

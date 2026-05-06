/**
 * OAuth 콜백에서 백엔드가 내려준 토큰을 추출하고,
 * 미들웨어가 요구하는 REFRESH_TOKEN(httpOnly) 쿠키를 BFF 경로로 설정합니다.
 */

export const ACCESS_TOKEN_STORAGE_KEY = 'ACCESS_TOKEN';

export const resolveAccessToken = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = ['accessToken', 'access_token', 'token'];
  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(record)) {
    const nestedToken = resolveAccessToken(nestedValue);
    if (nestedToken) {
      return nestedToken;
    }
  }

  return null;
};

export const resolveRefreshToken = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = ['refreshToken', 'refresh_token'];
  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(record)) {
    const nestedToken = resolveRefreshToken(nestedValue);
    if (nestedToken) {
      return nestedToken;
    }
  }

  return null;
};

export const persistRefreshTokenCookie = async (
  refreshToken: string | null,
): Promise<boolean> => {
  if (!refreshToken || typeof window === 'undefined') {
    return false;
  }

  const response = await fetch('/api/oauth/set-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refreshToken }),
  });

  return response.ok;
};

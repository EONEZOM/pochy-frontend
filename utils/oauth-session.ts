/**
 * OAuth 콜백에서 백엔드가 내려준 토큰을 추출하고,
 * 미들웨어가 요구하는 REFRESH_TOKEN(httpOnly) 쿠키를 BFF 경로로 설정합니다.
 */

export const ACCESS_TOKEN_STORAGE_KEY = 'ACCESS_TOKEN';
const OAUTH_SIGNUP_EMAIL_KEY = 'OAUTH_SIGNUP_EMAIL';

export type OAuthSignupHints = {
  email?: string | null;
};

export const persistOAuthSignupHints = (hints: OAuthSignupHints): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const email = hints.email?.trim();
  if (email) {
    window.sessionStorage.setItem(OAUTH_SIGNUP_EMAIL_KEY, email);
  }
};

export const readOAuthSignupEmail = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const email = window.sessionStorage.getItem(OAUTH_SIGNUP_EMAIL_KEY)?.trim();
  return email || null;
};

export const clearOAuthSignupHints = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(OAUTH_SIGNUP_EMAIL_KEY);
};

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

export const resolveOAuthEmail = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = ['email', 'userEmail', 'accountEmail'];
  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(record)) {
    const nestedEmail = resolveOAuthEmail(nestedValue);
    if (nestedEmail) {
      return nestedEmail;
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

const resolveErrorMessage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = ['message', 'error', 'detail'];
  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const nestedCandidates = [record.result, record.data, record.response];
  for (const nested of nestedCandidates) {
    const nestedMessage = resolveErrorMessage(nested);
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return null;
};

export const formatOAuthCallbackError = (
  providerLabel: string,
  error: unknown,
): string => {
  const fallback = `${providerLabel} 로그인 처리에 실패했어요. 다시 시도해 주세요.`;

  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const record = error as Record<string, unknown>;
  const response =
    typeof record.response === 'object' && record.response !== null
      ? (record.response as Record<string, unknown>)
      : null;
  const status =
    typeof response?.status === 'number' ? String(response.status) : null;
  const message =
    resolveErrorMessage(response?.data) ??
    resolveErrorMessage(record) ??
    null;

  if (status && message) {
    return `${providerLabel} 로그인 실패 (${status}): ${message}`;
  }
  if (status) {
    return `${providerLabel} 로그인 실패 (${status})`;
  }
  if (message) {
    return `${providerLabel} 로그인 실패: ${message}`;
  }

  return fallback;
};

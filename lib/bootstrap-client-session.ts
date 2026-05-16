import { ACCESS_TOKEN_COOKIE_KEY } from '@/lib/auth-cookie';
import { reissueWithTimeout } from '@/lib/reissue-with-timeout';
import { ACCESS_TOKEN_STORAGE_KEY } from '@/utils/oauth-session';

/** 미들웨어가 심은 ACCESS_TOKEN 쿠키를 axios용 localStorage에 반영합니다. */
export const syncAccessTokenFromCookie = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  const escapedName = ACCESS_TOKEN_COOKIE_KEY.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
  );
  const raw = match?.[1];
  if (!raw) {
    return false;
  }

  const token = decodeURIComponent(raw.trim());
  if (!token) {
    return false;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  return true;
};

/**
 * 매직링크·소셜 로그인 직후 클라이언트 세션을 준비합니다.
 * REFRESH_TOKEN 쿠키로 reissue해 localStorage에 액세스 토큰을 맞춥니다.
 */
export const bootstrapClientSession = async (): Promise<void> => {
  syncAccessTokenFromCookie();

  const hasAccessInStorage = Boolean(
    typeof window !== 'undefined' &&
      window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim(),
  );

  if (hasAccessInStorage) {
    return;
  }

  await reissueWithTimeout();
};

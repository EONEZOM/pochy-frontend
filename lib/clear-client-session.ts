import { ACCESS_TOKEN_COOKIE_KEY } from '@/lib/auth-cookie';
import { ACCESS_TOKEN_STORAGE_KEY } from '@/utils/oauth-session';

/** 만료·무효 액세스 토큰을 클라이언트에서 제거합니다. */
export const clearClientSession = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_TOKEN_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax${secure}`;
};

/** 액세스(localStorage)와 리프레시(httpOnly) 세션을 모두 정리합니다. */
export const clearFullAuthSession = async (): Promise<void> => {
  clearClientSession();

  if (typeof window === 'undefined') {
    return;
  }

  try {
    await fetch('/api/auth/clear-session', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // 네트워크 오류 시에도 로컬 세션은 이미 제거됨
  }
};

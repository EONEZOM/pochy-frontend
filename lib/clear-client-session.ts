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

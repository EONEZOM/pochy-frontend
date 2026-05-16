import { ACCESS_TOKEN_COOKIE_KEY } from '@/lib/auth-cookie';
import {
  agentDebugLog,
  getClientAuthSnapshot,
} from '@/lib/debug-agent-log';
import { reissueWithTimeout } from '@/lib/reissue-with-timeout';
import { ACCESS_TOKEN_STORAGE_KEY } from '@/utils/oauth-session';
import { isAxiosError } from 'axios';

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
  const before = getClientAuthSnapshot();
  const synced = syncAccessTokenFromCookie();
  const afterSync = getClientAuthSnapshot();

  // #region agent log
  agentDebugLog({
    hypothesisId: 'H3',
    location: 'bootstrap-client-session.ts:before-reissue',
    message: 'bootstrap before reissue',
    data: { before, synced, afterSync },
  });
  // #endregion

  const hasAccessInStorage = Boolean(
    typeof window !== 'undefined' &&
      window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim(),
  );

  if (hasAccessInStorage) {
    // #region agent log
    agentDebugLog({
      hypothesisId: 'H3',
      location: 'bootstrap-client-session.ts:skip-reissue',
      message: 'skip reissue; access token already in storage',
      data: getClientAuthSnapshot(),
    });
    // #endregion
    return;
  }

  try {
    await reissueWithTimeout();
    // #region agent log
    agentDebugLog({
      hypothesisId: 'H3',
      location: 'bootstrap-client-session.ts:reissue-ok',
      message: 'reissue succeeded',
      data: getClientAuthSnapshot(),
    });
    // #endregion
  } catch (error) {
    // #region agent log
    agentDebugLog({
      hypothesisId: 'H3',
      location: 'bootstrap-client-session.ts:reissue-fail',
      message: 'reissue failed',
      data: {
        snapshot: getClientAuthSnapshot(),
        status: isAxiosError(error) ? error.response?.status : null,
        code:
          isAxiosError(error) &&
          typeof error.response?.data === 'object' &&
          error.response?.data !== null
            ? (error.response.data as Record<string, unknown>).code
            : null,
      },
    });
    // #endregion
    throw error;
  }
};

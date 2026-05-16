import { reissue } from '@/api/generated/login-controller/login-controller';

const DEFAULT_REISSUE_TIMEOUT_MS = 6000;

/**
 * 로그인·오프닝 등에서 세션 확인용 reissue — 백엔드 미응답 시 axios 15s 대기를 막습니다.
 */
export const reissueWithTimeout = async (
  timeoutMs = DEFAULT_REISSUE_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await reissue(undefined, controller.signal);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

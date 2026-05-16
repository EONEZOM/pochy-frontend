import { reissueSession } from '@/api/axios-instance';

const DEFAULT_REISSUE_TIMEOUT_MS = 15000;

/**
 * 로그인·오프닝 등에서 세션 확인용 reissue — 백엔드 미응답 시 axios 15s 대기를 막습니다.
 */
export const reissueWithTimeout = async (
  timeoutMs = DEFAULT_REISSUE_TIMEOUT_MS,
): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    await reissueSession(controller.signal);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

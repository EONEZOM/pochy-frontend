const DEBUG_SESSION_ID = '4fabf0';
const DEBUG_INGEST_URL =
  'http://127.0.0.1:7243/ingest/5a029fea-afe4-4ab8-a8b7-fb154c62fb7a';

export type AgentLogPayload = {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  runId?: string;
};

export const agentDebugLog = (payload: AgentLogPayload): void => {
  // #region agent log
  fetch(DEBUG_INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
  // #endregion
};

export const getClientAuthSnapshot = (): Record<string, unknown> => {
  if (typeof document === 'undefined') {
    return {};
  }

  const cookieNames = document.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0])
    .filter(Boolean);

  const hasAccessCookie = cookieNames.includes('ACCESS_TOKEN');
  const hasRefreshCookieName = cookieNames.includes('REFRESH_TOKEN');
  const accessInStorage = Boolean(
    window.localStorage.getItem('ACCESS_TOKEN')?.trim(),
  );

  return {
    hasAccessCookie,
    hasRefreshCookieName,
    accessInStorage,
    cookieNameCount: cookieNames.length,
  };
};

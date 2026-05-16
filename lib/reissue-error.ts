import { isAxiosError } from 'axios';

export type ReissueFailureKind = 'noAccount' | 'sessionExpired' | 'network';

export const REISSUE_ERROR_CODE = {
  REFRESH_MISSING: 'REFRESH_MISSING',
  REFRESH_INVALID: 'REFRESH_INVALID',
} as const;

const resolveReissueErrorCode = (error: unknown): string | null => {
  if (!isAxiosError(error)) {
    return null;
  }

  const data = error.response?.data;
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const code = (data as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
};

export const classifyReissueError = (error: unknown): ReissueFailureKind => {
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return 'network';
    }

    const errorCode = resolveReissueErrorCode(error);
    if (errorCode === REISSUE_ERROR_CODE.REFRESH_INVALID) {
      return 'sessionExpired';
    }
    if (errorCode === REISSUE_ERROR_CODE.REFRESH_MISSING) {
      return 'noAccount';
    }

    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return 'sessionExpired';
    }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'network';
  }

  return 'network';
};

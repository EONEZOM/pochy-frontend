export const OPENING_SEEN_COOKIE_KEY = 'OPENING_SEEN';

const OPENING_SEEN_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** 오프닝을 한 번 통과했음을 표시합니다 (middleware가 `/` 진입 시 참고). */
export const markOpeningSeen = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${OPENING_SEEN_COOKIE_KEY}=1; path=/; max-age=${OPENING_SEEN_MAX_AGE_SEC}; SameSite=Lax${secure}`;
};

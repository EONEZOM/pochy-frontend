import type { NextRequest, NextResponse } from 'next/server';

/** 회원가입 직후 닉네임 설정 화면을 반드시 거치도록 표시 (sessionStorage) */
const PENDING_NICKNAME_SETUP_STORAGE_KEY = 'PENDING_NICKNAME_SETUP';

/** newMember === true 로 설정된 신규 가입 pending (success 안전장치에서 해제하지 않음) */
const PENDING_NICKNAME_EXPLICIT_SIGNUP_KEY = 'PENDING_NICKNAME_EXPLICIT_SIGNUP';

/** 매직링크 등 서버에서만 알 수 있는 신규 가입 (쿠키) */
export const PENDING_NICKNAME_SETUP_COOKIE_KEY = 'PENDING_NICKNAME_SETUP';

const PENDING_NICKNAME_COOKIE_MAX_AGE_SEC = 60 * 10;

/** true: 신규 가입, false: 기존 로그인, undefined: 닉네임 유무로 판별 */
export const shouldMarkPendingNicknameSetup = (
  newMember?: boolean | null,
  hasExistingNickname = false,
): boolean => {
  if (newMember === false) {
    return false;
  }
  if (newMember === true) {
    return true;
  }
  return !hasExistingNickname;
};

export const markPendingNicknameSetup = (explicitNewMember = false): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(PENDING_NICKNAME_SETUP_STORAGE_KEY, '1');
  if (explicitNewMember) {
    window.sessionStorage.setItem(PENDING_NICKNAME_EXPLICIT_SIGNUP_KEY, '1');
  } else {
    window.sessionStorage.removeItem(PENDING_NICKNAME_EXPLICIT_SIGNUP_KEY);
  }
};

const isExplicitSignupPending = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return (
    window.sessionStorage.getItem(PENDING_NICKNAME_EXPLICIT_SIGNUP_KEY) === '1'
  );
};

export const isPendingNicknameSetup = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (
    window.sessionStorage.getItem(PENDING_NICKNAME_SETUP_STORAGE_KEY) === '1'
  ) {
    return true;
  }

  const escapedName = PENDING_NICKNAME_SETUP_COOKIE_KEY.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`),
  );
  return match?.[1]?.trim() === '1';
};

export const clearPendingNicknameSetup = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PENDING_NICKNAME_SETUP_STORAGE_KEY);
  window.sessionStorage.removeItem(PENDING_NICKNAME_EXPLICIT_SIGNUP_KEY);
  document.cookie = `${PENDING_NICKNAME_SETUP_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
};

/** success 등에서 pending 오설정 복구 가능 여부 (명시적 신규 가입이 아닐 때만) */
export const canClearMisplacedPendingNicknameSetup = (): boolean => {
  return isPendingNicknameSetup() && !isExplicitSignupPending();
};

export const applyPendingNicknameSetupCookie = (
  response: NextResponse,
  request: NextRequest,
): void => {
  response.cookies.set({
    name: PENDING_NICKNAME_SETUP_COOKIE_KEY,
    value: '1',
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: PENDING_NICKNAME_COOKIE_MAX_AGE_SEC,
  });
};

const WITHDRAWN_NICKNAME_PREFIX = '탈퇴한 회원';

/** 백엔드가 탈퇴 계정에 부여하는 닉네임 패턴 */
export const isWithdrawnMemberNickname = (
  nickname?: string | null,
): boolean => {
  const trimmed = nickname?.trim();
  if (!trimmed) {
    return false;
  }
  return trimmed.startsWith(WITHDRAWN_NICKNAME_PREFIX);
};

/** 닉네임 설정이 끝난 회원으로 볼 수 있는지 (탈퇴용 placeholder 제외) */
export const hasUsableServerNickname = (
  nickname?: string | null,
): boolean => {
  const trimmed = nickname?.trim();
  if (!trimmed) {
    return false;
  }
  return !isWithdrawnMemberNickname(trimmed);
};

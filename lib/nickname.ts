import { AxiosError } from 'axios';

import type { ApiResponseDTO } from '@/api/model';
import { hasUsableServerNickname } from '@/lib/is-withdrawn-member';

export const isNicknameLengthValid = (nickname: string): boolean => {
  return nickname.length >= 2 && nickname.length <= 10;
};

const readNicknameCandidate = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveNicknameFromResponse = (
  data: ApiResponseDTO | null | undefined,
): string | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const directNickname = readNicknameCandidate(
    (data as { nickname?: unknown }).nickname,
  );
  if (directNickname) {
    return directNickname;
  }

  const { result } = data;
  const fromStringResult = readNicknameCandidate(result);
  if (fromStringResult) {
    return fromStringResult;
  }

  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;
    return (
      readNicknameCandidate(record.nickname) ??
      readNicknameCandidate(record.nickName)
    );
  }

  return null;
};

/** 홈 API 닉네임이 가입 완료에 쓸 수 있는 값인지 */
export const resolveUsableHomeNickname = (
  nickname?: string | null,
): string | null => {
  const resolved = nickname?.trim();
  if (!resolved || !hasUsableServerNickname(resolved)) {
    return null;
  }
  if (!isNicknameLengthValid(resolved)) {
    return null;
  }
  return resolved;
};

export const getNicknameErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.response?.status === 409) {
      return '이미 사용 중인 닉네임이에요. 다른 이름을 입력해 주세요.';
    }
    if (error.response?.status === 400) {
      return '닉네임 형식이 올바르지 않아요. 다른 이름을 입력하거나 잠시 후 다시 시도해 주세요.';
    }
    if (error.response?.status === 403) {
      return '로그인 정보가 유효하지 않아요. 다시 로그인해 주세요.';
    }
    return '닉네임 저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
  }
  return '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
};

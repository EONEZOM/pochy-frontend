import { AxiosError } from 'axios';

import type { ApiResponseDTO } from '@/api/model';

export const isNicknameLengthValid = (nickname: string): boolean => {
  return nickname.length >= 2 && nickname.length <= 10;
};

export const resolveNicknameFromResponse = (
  data: ApiResponseDTO,
): string | null => {
  return typeof data?.result === 'string' && data.result.trim().length > 0
    ? data.result.trim()
    : null;
};

export const getNicknameErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.response?.status === 409) {
      return '이미 사용 중인 닉네임이에요. 다른 이름을 입력해 주세요.';
    }
    if (error.response?.status === 403) {
      return '로그인 정보가 유효하지 않아요. 다시 로그인해 주세요.';
    }
    return '닉네임 저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
  }
  return '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
};

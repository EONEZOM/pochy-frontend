/**
 * 마이 프로필 수정용 수동 멀티파트 래퍼
 *
 * Orval 생성 `updateMyProfile`은 Content-Type이 application/json으로 고정되어 있어
 * Spring @RequestPart(request JSON) 패턴과 맞지 않습니다.
 *
 * profileImage 없이 request만내면, 백엔드가 프로필 이미지가 없을 때
 * DB에 저장된 랜덤 기본 이미지를 자동 할당합니다.
 *
 * @see lib/wish-cosmetics.ts
 */
import { getMyProfile } from '@/api/generated/member-controller/member-controller';
import { customInstance } from '@/api/axios-instance';
import type { UpdateProfileDto } from '@/api/model';

export const patchMyProfileRequestOnly = async (request: UpdateProfileDto) => {
  const formData = new FormData();
  formData.append(
    'request',
    new Blob([JSON.stringify(request)], { type: 'application/json' }),
  );

  return customInstance({
    url: '/api/member',
    method: 'PATCH',
    data: formData,
  });
};

/**
 * 회원가입(닉네임 설정) 직후, 프로필 이미지가 없으면 서버 기본 프사를 할당합니다.
 * profileImageUrl이 이미 있으면 API 호출을 생략합니다.
 */
export const saveDefaultProfileAfterSignup = async (nickname: string) => {
  const trimmedNickname = nickname.trim();
  if (!trimmedNickname) {
    throw new Error('닉네임이 비어 있습니다.');
  }

  const profileResponse = await getMyProfile();
  const profile = profileResponse.result;

  if (profile?.profileImageUrl?.trim()) {
    return;
  }

  const email = profile?.email?.trim();
  if (!email) {
    throw new Error('프로필 이메일을 확인할 수 없습니다.');
  }

  return patchMyProfileRequestOnly({
    nickname: trimmedNickname,
    email,
  });
};

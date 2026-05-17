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
import type { ProfileDto, UpdateProfileDto } from '@/api/model';
import { fetchDefaultProfileImageFile } from '@/lib/default-profile-images';
import { readOAuthSignupEmail } from '@/utils/oauth-session';

type ProfileLike = ProfileDto & {
  profileImgUrl?: string;
  profileUrl?: string;
};

export const extractProfileImageUrl = (
  profile: ProfileLike | undefined,
): string | null => {
  const candidates = [
    profile?.profileImageUrl,
    profile?.profileImgUrl,
    profile?.profileUrl,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
};

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

const patchMyProfileWithImage = async (
  request: UpdateProfileDto,
  profileImage: File,
) => {
  const formData = new FormData();
  formData.append(
    'request',
    new Blob([JSON.stringify(request)], { type: 'application/json' }),
  );
  formData.append('profileImage', profileImage);

  return customInstance({
    url: '/api/member',
    method: 'PATCH',
    data: formData,
  });
};

const resolveProfileEmail = (
  profile: ProfileDto | undefined,
  nickname: string,
): string => {
  const fromProfile = profile?.email?.trim();
  if (fromProfile) {
    return fromProfile;
  }

  const fromOAuth = readOAuthSignupEmail();
  if (fromOAuth) {
    return fromOAuth;
  }

  const safeNickname = nickname.replace(/[^\w가-힣-]/g, '').slice(0, 20) || 'member';
  return `${safeNickname}@kakao.pochy`;
};

const fetchCurrentProfile = async (): Promise<ProfileLike | undefined> => {
  const profileResponse = await getMyProfile();
  return profileResponse.result as ProfileLike | undefined;
};

const hasAssignedProfileImage = async (): Promise<boolean> => {
  const profile = await fetchCurrentProfile();
  return Boolean(extractProfileImageUrl(profile));
};

/**
 * 프로필 이미지가 없으면 서버 기본 프사를 할당합니다.
 * 카카오 등 소셜 가입 시 닉네임이 이미 있어 /nickname 을 건너뛸 때도 호출합니다.
 */
export const ensureDefaultProfileImage = async (
  nicknameOverride?: string,
): Promise<void> => {
  const profile = await fetchCurrentProfile();

  if (extractProfileImageUrl(profile)) {
    return;
  }

  const nickname = (nicknameOverride ?? profile?.nickname)?.trim();
  if (!nickname) {
    return;
  }

  const request: UpdateProfileDto = {
    nickname,
    email: resolveProfileEmail(profile, nickname),
  };

  try {
    await patchMyProfileRequestOnly(request);
    if (await hasAssignedProfileImage()) {
      return;
    }
    console.warn(
      '[member-profile] request-only patch succeeded but profileImageUrl is still empty',
    );
  } catch (requestOnlyError) {
    console.warn(
      '[member-profile] request-only default profile failed, trying image upload',
      requestOnlyError,
    );
  }

  const profileImage = await fetchDefaultProfileImageFile();
  await patchMyProfileWithImage(request, profileImage);

  if (!(await hasAssignedProfileImage())) {
    throw new Error(
      '기본 프로필 이미지를 저장했지만 profileImageUrl을 확인하지 못했습니다.',
    );
  }
};

/**
 * 회원가입(닉네임 설정) 직후, 프로필 이미지가 없으면 서버 기본 프사를 할당합니다.
 */
export const saveDefaultProfileAfterSignup = async (nickname: string) => {
  const trimmedNickname = nickname.trim();
  if (!trimmedNickname) {
    throw new Error('닉네임이 비어 있습니다.');
  }

  await ensureDefaultProfileImage(trimmedNickname);
};

import { getHomeData } from '@/api/generated/home/home';
import { getMyProfile } from '@/api/generated/member-controller/member-controller';
import { isWithdrawnMemberNickname } from '@/lib/is-withdrawn-member';
import { isPendingNicknameSetup } from '@/lib/pending-nickname-setup';

export type PostAuthPath = '/' | '/nickname';

export type PostAuthResolveResult =
  | { status: 'ok'; path: PostAuthPath }
  | { status: 'withdrawn' }
  | { status: 'failed' };

const resolvePathFromNickname = (nickname?: string | null): PostAuthResolveResult => {
  const trimmedNickname = nickname?.trim();

  if (isWithdrawnMemberNickname(trimmedNickname)) {
    return { status: 'withdrawn' };
  }

  if (isPendingNicknameSetup()) {
    return { status: 'ok', path: '/nickname' };
  }

  return {
    status: 'ok',
    path: trimmedNickname ? '/' : '/nickname',
  };
};

/**
 * reissue·소셜 로그인 직후 이동 경로 — 서버 닉네임 유무로 홈/닉네임 설정을 구분합니다.
 */
export const resolvePostAuthPath = async (): Promise<PostAuthResolveResult> => {
  try {
    const response = await getHomeData();
    return resolvePathFromNickname(response?.result?.nickname);
  } catch (homeError) {
    console.warn('[resolvePostAuthPath] getHomeData failed, trying getMyProfile', homeError);
  }

  try {
    const profileResponse = await getMyProfile();
    return resolvePathFromNickname(profileResponse?.result?.nickname);
  } catch (profileError) {
    console.warn('[resolvePostAuthPath] getMyProfile failed', profileError);
    return { status: 'failed' };
  }
};

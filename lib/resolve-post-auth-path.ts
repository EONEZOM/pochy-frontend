import { getHomeData } from '@/api/generated/home/home';
import { isWithdrawnMemberNickname } from '@/lib/is-withdrawn-member';

export type PostAuthPath = '/' | '/nickname';

export type PostAuthResolveResult =
  | { status: 'ok'; path: PostAuthPath }
  | { status: 'withdrawn' }
  | { status: 'failed' };

/**
 * reissue·소셜 로그인 직후 이동 경로 — 서버 닉네임 유무로 홈/닉네임 설정을 구분합니다.
 */
export const resolvePostAuthPath = async (): Promise<PostAuthResolveResult> => {
  try {
    const response = await getHomeData();
    const nickname = response?.result?.nickname?.trim();

    if (isWithdrawnMemberNickname(nickname)) {
      return { status: 'withdrawn' };
    }

    return {
      status: 'ok',
      path: nickname ? '/' : '/nickname',
    };
  } catch {
    return { status: 'failed' };
  }
};

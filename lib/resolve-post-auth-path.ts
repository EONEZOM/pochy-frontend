import { getHomeData } from '@/api/generated/home/home';

export type PostAuthPath = '/' | '/nickname' | '/login';

/**
 * reissue·소셜 로그인 직후 이동 경로 — 서버 닉네임 유무로 홈/닉네임 설정을 구분합니다.
 */
export const resolvePostAuthPath = async (): Promise<PostAuthPath> => {
  try {
    const response = await getHomeData();
    const nickname = response?.result?.nickname?.trim();
    return nickname ? '/' : '/nickname';
  } catch {
    return '/login';
  }
};

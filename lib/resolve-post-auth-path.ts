import { getHomeData } from '@/api/generated/home/home';

export type PostAuthPath = '/' | '/nickname';

/**
 * reissue·소셜 로그인 직후 이동 경로 — 서버 닉네임 유무로 홈/닉네임 설정을 구분합니다.
 * API 실패 시 null (호출부에서 로그인 UI 유지·세션 정리).
 */
export const resolvePostAuthPath = async (): Promise<PostAuthPath | null> => {
  try {
    const response = await getHomeData();
    const nickname = response?.result?.nickname?.trim();
    return nickname ? '/' : '/nickname';
  } catch {
    return null;
  }
};

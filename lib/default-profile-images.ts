/** 회원가입 시 이메일 없을 때 업로드용 기본 프로필 이미지 (Figma `profil/`) */
export const DEFAULT_PROFILE_IMAGE_PATHS = [
  '/figma/profil/임시 프로필 사진.svg',
  '/figma/profil/임시 프로필 사진-1.svg',
  '/figma/profil/임시 프로필 사진-2.svg',
] as const;

export const pickDefaultProfileImagePath = (): string => {
  const index = Math.floor(Math.random() * DEFAULT_PROFILE_IMAGE_PATHS.length);
  return DEFAULT_PROFILE_IMAGE_PATHS[index];
};

export const fetchDefaultProfileImageFile = async (): Promise<File> => {
  const imagePath = pickDefaultProfileImagePath();
  const response = await fetch(imagePath);
  if (!response.ok) {
    throw new Error(`기본 프로필 이미지를 불러오지 못했습니다. (${response.status})`);
  }

  const blob = await response.blob();
  const fileName = imagePath.split('/').pop() ?? 'default-profile.svg';
  return new File([blob], fileName, {
    type: blob.type || 'image/svg+xml',
  });
};

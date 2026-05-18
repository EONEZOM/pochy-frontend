/**
 * @imgly/background-removal 래퍼.
 * 실패 시 원본을 그대로 반환합니다(스캔 등록과 동일 정책).
 */
export type RemoveProductBackgroundResult = {
  blob: Blob;
  previewUrl: string;
};

const toInputUrl = (source: string | Blob | File): { url: string; revoke: boolean } => {
  if (typeof source === 'string') {
    return { url: source, revoke: false };
  }
  return { url: URL.createObjectURL(source), revoke: true };
};

const toFallbackBlob = async (
  source: string | Blob | File,
): Promise<Blob> => {
  if (source instanceof Blob) {
    return source;
  }
  if (typeof source === 'string') {
    const response = await fetch(source);
    return response.blob();
  }
  return source;
};

export type BackgroundRemovalModel = 'isnet' | 'isnet_quint8';

export const removeProductBackground = async (
  source: string | Blob | File,
  options?: { model?: BackgroundRemovalModel },
): Promise<RemoveProductBackgroundResult> => {
  const { url: inputUrl, revoke } = toInputUrl(source);
  const model = options?.model ?? 'isnet_quint8';

  try {
    const { removeBackground } = await import('@imgly/background-removal');
    const blob = await removeBackground(inputUrl, { model });
    const previewUrl = URL.createObjectURL(blob);
    return { blob, previewUrl };
  } catch {
    const blob = await toFallbackBlob(source);
    const previewUrl =
      typeof source === 'string' ? source : URL.createObjectURL(blob);
    return { blob, previewUrl };
  } finally {
    if (revoke) {
      URL.revokeObjectURL(inputUrl);
    }
  }
};

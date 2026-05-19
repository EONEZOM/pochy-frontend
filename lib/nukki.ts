/**
 * @imgly/background-removal 래퍼.
 * 실패 시 preview용 URL만 반환하고 didRemoveBackground=false로 표시합니다.
 */
export type RemoveProductBackgroundResult = {
  blob: Blob;
  previewUrl: string;
  /** true면 배경 제거 성공 — directImages 업로드에 사용 */
  didRemoveBackground: boolean;
};

export type BackgroundRemovalModel = 'isnet' | 'isnet_fp16' | 'isnet_quint8';

export type ProductBackgroundRemovalOptions = {
  model?: BackgroundRemovalModel;
};

/** 배경만 제거·제품 전경 보존에 맞춘 기본 설정 */
export const PRODUCT_BACKGROUND_REMOVAL_CONFIG = {
  model: 'isnet_fp16' as const,
  output: {
    format: 'image/png' as const,
    type: 'foreground' as const,
  },
};

const MODEL_FALLBACK_ORDER: BackgroundRemovalModel[] = [
  'isnet_fp16',
  'isnet',
];

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

const runRemoveBackground = async (
  inputUrl: string,
  model: BackgroundRemovalModel,
): Promise<Blob> => {
  const { removeBackground } = await import('@imgly/background-removal');
  return removeBackground(inputUrl, {
    model,
    output: PRODUCT_BACKGROUND_REMOVAL_CONFIG.output,
  });
};

const resolveModelsToTry = (
  preferred?: BackgroundRemovalModel,
): BackgroundRemovalModel[] => {
  const primary = preferred ?? PRODUCT_BACKGROUND_REMOVAL_CONFIG.model;
  const ordered = [primary, ...MODEL_FALLBACK_ORDER.filter((m) => m !== primary)];
  return [...new Set(ordered)];
};

export const preloadNukkiAssets = async (): Promise<void> => {
  try {
    const { preload } = await import('@imgly/background-removal');
    await preload({
      model: PRODUCT_BACKGROUND_REMOVAL_CONFIG.model,
      output: PRODUCT_BACKGROUND_REMOVAL_CONFIG.output,
    });
  } catch (error) {
    console.warn('[nukki] preload 실패:', error);
  }
};

export const removeProductBackground = async (
  source: string | Blob | File,
  options?: ProductBackgroundRemovalOptions,
): Promise<RemoveProductBackgroundResult> => {
  const { url: inputUrl, revoke } = toInputUrl(source);
  const modelsToTry = resolveModelsToTry(options?.model);

  try {
    let lastError: unknown;
    for (const model of modelsToTry) {
      try {
        const blob = await runRemoveBackground(inputUrl, model);
        const previewUrl = URL.createObjectURL(blob);
        return { blob, previewUrl, didRemoveBackground: true };
      } catch (error) {
        lastError = error;
        console.warn(`[nukki] 배경 제거 실패 (model=${model}):`, error);
      }
    }
    console.error('[nukki] 모든 모델 시도 실패:', lastError);
    const blob = await toFallbackBlob(source);
    const previewUrl =
      typeof source === 'string' ? source : URL.createObjectURL(blob);
    return { blob, previewUrl, didRemoveBackground: false };
  } finally {
    if (revoke) {
      URL.revokeObjectURL(inputUrl);
    }
  }
};

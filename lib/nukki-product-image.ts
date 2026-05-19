import { removeProductBackground } from '@/lib/nukki';
import { toSameOriginImageProxyUrl } from '@/lib/next-image-src';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

export type ProductImageNukkiResult = {
  official_image?: string;
  nukkiBlob?: Blob;
};

const toNukkiInputUrl = (source: string | File): string | File => {
  if (source instanceof File) {
    return source;
  }

  const trimmed = source.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith('/api/media-proxy?')) {
    return trimmed;
  }

  const resolved = resolveMediaUrl(trimmed);
  if (/^https?:\/\//i.test(resolved)) {
    return toSameOriginImageProxyUrl(resolved) || resolved;
  }

  return resolved;
};

/** 네이버 쇼핑 등 원격 URL을 media-proxy 경유 후 누끼 처리 */
export const applyNukkiFromRemoteUrl = async (
  imageUrl: string,
): Promise<ReturnType<typeof removeProductBackground>> => {
  const inputUrl = toNukkiInputUrl(imageUrl);
  if (typeof inputUrl !== 'string' || inputUrl.length === 0) {
    return removeProductBackground(imageUrl);
  }
  return removeProductBackground(inputUrl);
};

/** ProductDetailForm `onImageFileSelected` / `onOfficialImageUrlSelected`용 */
export const applyProductImageNukki = async (
  source: string | File,
): Promise<ProductImageNukkiResult> => {
  const input = toNukkiInputUrl(source);
  const { blob, previewUrl, didRemoveBackground } =
    await removeProductBackground(input);
  return {
    official_image: previewUrl,
    nukkiBlob: didRemoveBackground ? blob : undefined,
  };
};

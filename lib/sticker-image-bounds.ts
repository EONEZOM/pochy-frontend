/** 0~1 정규화된 불투명 영역 bbox */
export type NormalizedOpaqueBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const ALPHA_THRESHOLD = 8;
const MAX_SAMPLE_DIMENSION = 256;

/**
 * 이미지에서 알파가 있는 픽셀의 정규화 bbox를 측정합니다.
 * CORS·캔버스 오류 시 null.
 */
export const measureOpaqueBoundsFromImage = (
  img: HTMLImageElement,
): NormalizedOpaqueBounds | null => {
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }

  const scale = Math.min(
    1,
    MAX_SAMPLE_DIMENSION / Math.max(naturalWidth, naturalHeight),
  );
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  let imageData: ImageData;
  try {
    ctx.drawImage(img, 0, 0, width, height);
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return null;
  }

  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) {
          minX = x;
        }
        if (x > maxX) {
          maxX = x;
        }
        if (y < minY) {
          minY = y;
        }
        if (y > maxY) {
          maxY = y;
        }
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return null;
  }

  return {
    left: minX / width,
    top: minY / height,
    right: (maxX + 1) / width,
    bottom: (maxY + 1) / height,
  };
};

/**
 * 불투명 영역 중심이 정사각형 레이어 박스 중앙에 오도록 object-position 문자열을 계산합니다.
 */
export const boundsToObjectPosition = (bounds: NormalizedOpaqueBounds): string => {
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const posX = (0.5 + (0.5 - centerX)) * 100;
  const posY = (0.5 + (0.5 - centerY)) * 100;
  return `${posX.toFixed(2)}% ${posY.toFixed(2)}%`;
};

export const measureStickerObjectPosition = (
  img: HTMLImageElement,
): string | null => {
  const bounds = measureOpaqueBoundsFromImage(img);
  if (!bounds) {
    return null;
  }
  return boundsToObjectPosition(bounds);
};

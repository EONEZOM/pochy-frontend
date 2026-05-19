import { ImageFileData } from '@/types/image';

/**
 * 이미지를 OpenAI 비전 최적화 규격(최대 768px)으로 리사이징
 * 파일 용량이 작아도 해상도가 높으면 토큰이 많이 소모되기 때문
 */
export const resizeImage = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onerror = () =>
      reject(new Error('이미지 파일 읽기에 실패했습니다.'));
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onerror = () => reject(new Error('이미지 로드에 실패했습니다.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIDE = 768; // OpenAI High Detail 모드 최적화 기준
        let width = img.width;
        let height = img.height;

        // 가로세로 비율 유지하며 리사이징
        if (width > height) {
          if (width > MAX_SIDE) {
            height *= MAX_SIDE / width;
            width = MAX_SIDE;
          }
        } else {
          if (height > MAX_SIDE) {
            width *= MAX_SIDE / height;
            height = MAX_SIDE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // JPEG로 변환하여 문자열 길이를 줄임 (품질 0.8)
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  });
};

/**
 * FileList로부터 File 객체와 브라우저 프리뷰용 URL 쌍을 추출
 * 백엔드 전송을 위한 원본 파일 보존과 UI 렌더링을 동시에 처리
 * * @param fileList - input[type="file"]에서 전달받은 FileList 객체
 * @returns 각 파일의 원본 객체와 생성된 previewUrl을 포함하는 ImageFileData 배열
 */
export const extractImageFileData = (
  fileList: FileList | null,
): ImageFileData[] => {
  if (!fileList) return [];

  return Array.from(fileList).map((file) => ({
    file,
    previewUrl: URL.createObjectURL(file),
  }));
};

/**
 * 생성된 모든 Preview URL을 브라우저 메모리에서 해제
 * URL.createObjectURL로 생성된 리소스는 명시적으로 해제하지 않으면
 * 페이지가 닫히기 전까지 메모리에 남아 성능 저하를 유발
 * * @param data - 해제할 previewUrl이 포함된 ImageFileData 배열
 */
export const revokeImagePreviewUrls = (data: ImageFileData[]): void => {
  data.forEach((item) => URL.revokeObjectURL(item.previewUrl));
};

/**
 * Blob 객체를 Base64 문자열로 변환합니다.
 */
export const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * File 객체를 지정한 최대 픽셀 기준으로 리사이징해 새 File로 반환합니다.
 * - GPT Vision 분석과 백엔드 S3 업로드 모두에 적합한 크기로 줄입니다.
 * - 이미 maxSidePx 이하인 이미지는 변환 없이 원본을 반환합니다.
 *
 * 기본값 근거
 *   maxSidePx = 1920 : OpenAI High Detail 최대 유효 해상도(2048px) 하위 최적값.
 *                      텍스트 인식에 충분한 픽셀을 확보합니다.
 *   quality = 0.9    : 0.75 이하에서 발생하는 JPEG DCT 블록 노이즈(링잉)가
 *                      소문자/얇은 폰트 경계를 뭉개 GPT 인식률을 낮춥니다.
 *                      1920px × 0.9 기준 한 장 ~700KB~1.2MB 내외입니다.
 */
export const resizeImageFile = (
  file: File,
  maxSidePx = 1920,
  quality = 0.9,
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지 로드에 실패했습니다.'));
    };

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width <= maxSidePx && height <= maxSidePx) {
        resolve(file);
        return;
      }

      if (width > height) {
        height = Math.round(height * (maxSidePx / width));
        width = maxSidePx;
      } else {
        width = Math.round(width * (maxSidePx / height));
        height = maxSidePx;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // 다운스케일 시 텍스트 선명도를 최대한 유지합니다.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // brightness는 밝은 배경/흰 글자 조합에서 정보 날림(Clipping)을 유발하므로 제거합니다.
        // contrast를 강하게 올려 어두운 배경 내 텍스트 경계를 선명하게 합니다.
        // saturate는 브랜드 고유 컬러 구분을 돕습니다.
        ctx.filter = 'contrast(1.1) saturate(1.1)';
        ctx.drawImage(img, 0, 0, width, height);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('캔버스 → Blob 변환에 실패했습니다.'));
            return;
          }
          const resizedName = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], resizedName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };

    img.src = objectUrl;
  });
};

/**
 * data URL(GPT Vision·누끼 입력)용 리사이즈.
 * 긴 변 maxSidePx, OCR 대비 contrast/saturate 필터는 resizeImageFile과 동일합니다.
 */
export const resizeDataUrlForVision = (
  dataUrl: string,
  maxSidePx = 1920,
  quality = 0.9,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = () => {
      reject(new Error('이미지 로드에 실패했습니다.'));
    };

    img.onload = () => {
      let { width, height } = img;

      if (width <= maxSidePx && height <= maxSidePx) {
        resolve(dataUrl);
        return;
      }

      if (width > height) {
        height = Math.round(height * (maxSidePx / width));
        width = maxSidePx;
      } else {
        width = Math.round(width * (maxSidePx / height));
        height = maxSidePx;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.filter = 'contrast(1.1) saturate(1.1)';
        ctx.drawImage(img, 0, 0, width, height);
      }

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.src = dataUrl;
  });
};

export type NormalizedBBox = {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const isValidProductBbox = (bbox: NormalizedBBox): boolean => {
  const xMin = clamp01(bbox.x_min);
  const yMin = clamp01(bbox.y_min);
  const xMax = clamp01(bbox.x_max);
  const yMax = clamp01(bbox.y_max);

  if (xMax <= xMin || yMax <= yMin) {
    return false;
  }

  const width = xMax - xMin;
  const height = yMax - yMin;
  const area = width * height;

  if (area < 0.03 || area > 0.95) {
    return false;
  }

  const aspect = width / height;
  if (aspect < 0.08 || aspect > 12) {
    return false;
  }

  return true;
};

/** bbox 높이가 크롭 대비 지나치게 작으면 상단만 잡힌 것으로 간주 */
export const isBboxHeightSuspiciouslySmall = (
  bbox: NormalizedBBox,
  minHeightRatio = 0.7,
): boolean => {
  const height = clamp01(bbox.y_max) - clamp01(bbox.y_min);
  return height < minHeightRatio;
};

const VERTICAL_BBOX_ASPECT_THRESHOLD = 1.1;
const MISSING_BOTTOM_CAP_Y_MAX_THRESHOLD = 0.82;

/** 튜브·병 등 세로형 용기 bbox */
export const isVerticalProductBbox = (bbox: NormalizedBBox): boolean => {
  const width = clamp01(bbox.x_max) - clamp01(bbox.x_min);
  const height = clamp01(bbox.y_max) - clamp01(bbox.y_min);
  if (width <= 0) {
    return false;
  }
  return height / width >= VERTICAL_BBOX_ASPECT_THRESHOLD;
};

/** 세로형인데 하단 캡·뚜껑이 bbox 밖으로 잘린 것으로 추정 */
export const isBboxLikelyMissingBottomCap = (bbox: NormalizedBBox): boolean => {
  if (!isVerticalProductBbox(bbox)) {
    return false;
  }
  return clamp01(bbox.y_max) < MISSING_BOTTOM_CAP_Y_MAX_THRESHOLD;
};

/** bbox 하단을 아래로 확장 (검정 캡·뚜껑 여유) */
export const extendBboxBottom = (
  bbox: NormalizedBBox,
  extraRatio = 0.12,
): NormalizedBBox => {
  const yMin = clamp01(bbox.y_min);
  const yMax = clamp01(bbox.y_max);
  const height = yMax - yMin;

  return {
    x_min: clamp01(bbox.x_min),
    y_min: yMin,
    x_max: clamp01(bbox.x_max),
    y_max: clamp01(yMax + height * extraRatio),
  };
};

export const unionNormalizedBboxes = (
  a: NormalizedBBox,
  b: NormalizedBBox,
): NormalizedBBox => ({
  x_min: clamp01(Math.min(a.x_min, b.x_min)),
  y_min: clamp01(Math.min(a.y_min, b.y_min)),
  x_max: clamp01(Math.max(a.x_max, b.x_max)),
  y_max: clamp01(Math.max(a.y_max, b.y_max)),
});

export type BboxCropMargins =
  | number
  | {
      horizontal?: number;
      top?: number;
      bottom?: number;
    };

export const resolveBboxCropMargins = (
  bbox: NormalizedBBox,
  baseMarginRatio = 0.1,
): { horizontal: number; top: number; bottom: number } => {
  const bottom = isVerticalProductBbox(bbox) ? 0.15 : baseMarginRatio;
  return {
    horizontal: baseMarginRatio,
    top: baseMarginRatio,
    bottom,
  };
};

const normalizeCropMargins = (
  margin: BboxCropMargins,
  bbox: NormalizedBBox,
): { horizontal: number; top: number; bottom: number } => {
  if (typeof margin === 'number') {
    return resolveBboxCropMargins(bbox, margin);
  }
  const base = resolveBboxCropMargins(bbox, 0.1);
  return {
    horizontal: margin.horizontal ?? base.horizontal,
    top: margin.top ?? base.top,
    bottom: margin.bottom ?? base.bottom,
  };
};

export const cropDataUrlByNormalizedBBox = (
  dataUrl: string,
  bbox: NormalizedBBox,
  margin: BboxCropMargins = 0.05,
  quality = 0.92,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = () => {
      reject(new Error('bbox 크롭용 이미지 로드에 실패했습니다.'));
    };

    img.onload = () => {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      let xMin = clamp01(bbox.x_min) * imgW;
      let yMin = clamp01(bbox.y_min) * imgH;
      let xMax = clamp01(bbox.x_max) * imgW;
      let yMax = clamp01(bbox.y_max) * imgH;

      const boxW = xMax - xMin;
      const boxH = yMax - yMin;
      const margins = normalizeCropMargins(margin, bbox);
      const padX = boxW * margins.horizontal;
      const padTop = boxH * margins.top;
      const padBottom = boxH * margins.bottom;

      xMin = Math.max(0, xMin - padX);
      yMin = Math.max(0, yMin - padTop);
      xMax = Math.min(imgW, xMax + padX);
      yMax = Math.min(imgH, yMax + padBottom);

      const cropW = Math.max(1, Math.floor(xMax - xMin));
      const cropH = Math.max(1, Math.floor(yMax - yMin));

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('bbox 크롭 캔버스를 초기화할 수 없습니다.'));
        return;
      }

      ctx.drawImage(img, xMin, yMin, cropW, cropH, 0, 0, cropW, cropH);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.src = dataUrl;
  });
};

/**
 * 누끼 입력용 다운스케일 (메모리·속도). contrast 필터 없이 원색 유지.
 */
export const resizeDataUrlForNukki = (
  dataUrl: string,
  maxSidePx = 768,
  quality = 0.88,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = () => {
      reject(new Error('누끼 리사이즈용 이미지 로드에 실패했습니다.'));
    };

    img.onload = () => {
      let { width, height } = img;

      if (width <= maxSidePx && height <= maxSidePx) {
        resolve(dataUrl);
        return;
      }

      if (width > height) {
        height = Math.round(height * (maxSidePx / width));
        width = maxSidePx;
      } else {
        width = Math.round(width * (maxSidePx / height));
        height = maxSidePx;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.src = dataUrl;
  });
};

/** 누끼 모델이 제품 가장자리를 잡기 쉽도록 흰 여백을 둡니다. */
export const padDataUrlForNukki = (
  dataUrl: string,
  ratio = 0.05,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = () => {
      reject(new Error('누끼 패딩용 이미지 로드에 실패했습니다.'));
    };

    img.onload = () => {
      const padX = Math.max(8, Math.round(img.naturalWidth * ratio));
      const padY = Math.max(8, Math.round(img.naturalHeight * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth + padX * 2;
      canvas.height = img.naturalHeight + padY * 2;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('누끼 패딩 캔버스를 초기화할 수 없습니다.'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padX, padY);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.src = dataUrl;
  });
};

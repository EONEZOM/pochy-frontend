import { toBlob } from 'html-to-image';

import {
  uploadPouchShareImageMultipart,
} from '@/lib/pouch-api';
import { resolveDisplayImageSrc } from '@/lib/next-image-src';
import { embedPngTextChunks } from '@/lib/png-text-metadata';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { resolveFeedPouchImageUrl } from '@/lib/feed-display-image';

export const POUCH_SHARE_CAPTURE_ID = 'pouch-share-capture';

/** `PouchShareView` 캡처 영역 — Figma 그라데이션과 동일 */
export const POUCH_SHARE_GRADIENT_TOP = '#FFFFFF';
export const POUCH_SHARE_GRADIENT_BOTTOM = '#FFC6EC';
export const POUCH_SHARE_CAPTURE_WIDTH = 400;
export const POUCH_SHARE_CAPTURE_HEIGHT = 474;

const POUCH_SHARE_GRADIENT_STOP = 0.31;

export const buildPouchDetailShareUrl = (
  origin: string,
  pouchId: number,
  name: string,
) => {
  const query = name.trim()
    ? `?name=${encodeURIComponent(name.trim())}`
    : '';
  return `${origin}/share/pouch/${pouchId}${query}`;
};

/** 카카오 피드 미리보기용 — 공개 HTTPS URL만 사용 (프록시·blob 불가) */
export const resolveKakaoFeedImageUrl = (
  imageUrl: string | null | undefined,
): string | null => {
  const resolved = resolveMediaUrl(imageUrl)?.trim();
  if (!resolved || !/^https:\/\//i.test(resolved)) {
    return null;
  }
  return resolved;
};

export const ensureKakaoShareImageUrl = async ({
  imageUrl,
  pouchId,
  captureBlob,
}: {
  imageUrl?: string | null;
  pouchId: number;
  captureBlob?: Blob | null;
}): Promise<string | null> => {
  const fromList = resolveKakaoFeedImageUrl(imageUrl);
  if (fromList) {
    return fromList;
  }
  if (!captureBlob || captureBlob.size === 0) {
    return null;
  }
  try {
    const uploadedUrl = await uploadPouchShareImageMultipart(
      pouchId,
      captureBlob,
    );
    return resolveKakaoFeedImageUrl(uploadedUrl);
  } catch {
    return null;
  }
};

const INVALID_DOWNLOAD_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export const buildPouchShareDownloadFilename = (
  pouchName: string,
  pouchId: number,
): string => {
  const base =
    pouchName
      .trim()
      .replace(INVALID_DOWNLOAD_FILENAME_CHARS, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || `pouch-${pouchId}`;
  return `${base}.png`;
};

export type PouchShareImageMetadata = {
  pouchId: number;
  pouchName: string;
  linkUrl?: string;
};

export const preparePouchSharePng = async (
  blob: Blob,
  metadata: PouchShareImageMetadata,
): Promise<{ blob: Blob; filename: string }> => {
  const filename = buildPouchShareDownloadFilename(
    metadata.pouchName,
    metadata.pouchId,
  );
  const description =
    metadata.linkUrl?.trim() || `POCHY 파우치 · #${metadata.pouchId}`;
  const comment = JSON.stringify({
    pouchId: metadata.pouchId,
    name: metadata.pouchName,
    linkUrl: metadata.linkUrl ?? null,
    app: 'POCHY',
  });

  const withMetadata = await embedPngTextChunks(blob, [
    { keyword: 'Title', text: metadata.pouchName },
    { keyword: 'Description', text: description },
    { keyword: 'Software', text: 'POCHY' },
    { keyword: 'Comment', text: comment },
    { keyword: 'pouchId', text: String(metadata.pouchId) },
  ]);

  return { blob: withMetadata, filename };
};

const waitForPaintFrames = (frameCount = 2): Promise<void> => {
  return new Promise((resolve) => {
    const tick = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => {
        tick(remaining - 1);
      });
    };
    tick(frameCount);
  });
};

const paintPouchShareGradient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, POUCH_SHARE_GRADIENT_TOP);
  gradient.addColorStop(POUCH_SHARE_GRADIENT_STOP, POUCH_SHARE_GRADIENT_TOP);
  gradient.addColorStop(1, POUCH_SHARE_GRADIENT_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

const loadImageForPouchShare = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    const handleLoad = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      resolve(img);
    };
    const handleError = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      reject(new Error('파우치 이미지를 불러오지 못했습니다.'));
    };
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.src = src;
  });
};

/** 다운로드·캡처 실패 시 — 그라데이션 배경 + 파우치 합성 이미지 */
export const composePouchShareImageWithBackground = async (
  imageUrl: string,
  options?: {
    width?: number;
    height?: number;
    pixelRatio?: number;
  },
): Promise<Blob> => {
  const width = options?.width ?? POUCH_SHARE_CAPTURE_WIDTH;
  const height = options?.height ?? POUCH_SHARE_CAPTURE_HEIGHT;
  const pixelRatio = options?.pixelRatio ?? 2;
  const displaySrc = resolveDisplayImageSrc(
    resolveMediaUrl(resolveFeedPouchImageUrl(imageUrl)),
  );
  if (!displaySrc) {
    throw new Error('공유 이미지를 생성하지 못했습니다.');
  }

  const img = await loadImageForPouchShare(displaySrc);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('공유 이미지를 생성하지 못했습니다.');
  }

  ctx.scale(pixelRatio, pixelRatio);
  paintPouchShareGradient(ctx, width, height);

  const maxWidth = width * 0.85;
  const maxHeight = height * 0.72;
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    throw new Error('공유 이미지를 생성하지 못했습니다.');
  }
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => {
      resolve(value);
    }, 'image/png');
  });
  if (!blob) {
    throw new Error('공유 이미지를 생성하지 못했습니다.');
  }
  return blob;
};

export const captureShareElement = async (
  element: HTMLElement,
): Promise<Blob> => {
  await waitForPaintFrames(2);

  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 2,
    skipFonts: true,
    fetchRequestInit: {
      credentials: 'same-origin',
    },
  });
  if (!blob) {
    throw new Error('공유 이미지를 생성하지 못했습니다.');
  }
  return blob;
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
      };
    };
  }
}

const loadKakaoSdk = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Kakao) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      'script[data-kakao-sdk="true"]',
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Kakao SDK')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.async = true;
    script.dataset.kakaoSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kakao SDK'));
    document.head.appendChild(script);
  });
};

export const shareViaKakao = async (options: {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
}) => {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim();
  if (!jsKey) {
    if (navigator.share) {
      await navigator.share({
        title: options.title,
        text: options.description,
        url: options.linkUrl,
      });
      return;
    }
    throw new Error('카카오 공유 설정이 없습니다.');
  }

  await loadKakaoSdk();
  if (!window.Kakao?.isInitialized()) {
    window.Kakao?.init(jsKey);
  }

  const feedImageUrl = resolveKakaoFeedImageUrl(options.imageUrl);

  window.Kakao?.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: options.title,
      description: options.description,
      ...(feedImageUrl ? { imageUrl: feedImageUrl } : {}),
      link: {
        mobileWebUrl: options.linkUrl,
        webUrl: options.linkUrl,
      },
    },
    buttons: [
      {
        title: '\uC6F9\uC5D0\uC11C \uBCF4\uAE30',
        link: {
          mobileWebUrl: options.linkUrl,
          webUrl: options.linkUrl,
        },
      },
    ],
  });
};

export const shareImageFile = async (
  blob: Blob,
  metadata: PouchShareImageMetadata,
) => {
  if (!navigator.share || !navigator.canShare) {
    throw new Error('이 기기에서는 공유를 지원하지 않습니다.');
  }
  const { blob: prepared, filename } = await preparePouchSharePng(blob, metadata);
  const file = new File([prepared], filename, { type: 'image/png' });
  if (!navigator.canShare({ files: [file] })) {
    throw new Error('이미지 공유를 지원하지 않습니다.');
  }
  await navigator.share({
    title: metadata.pouchName,
    text: metadata.linkUrl,
    files: [file],
  });
};

import { toBlob } from 'html-to-image';

export const POUCH_SHARE_CAPTURE_ID = 'pouch-share-capture';

export const buildPouchDetailShareUrl = (
  origin: string,
  pouchId: number,
  name: string,
) => {
  const query = name.trim()
    ? `?name=${encodeURIComponent(name.trim())}`
    : '';
  return `${origin}/my-cosmetics/pouch/${pouchId}${query}`;
};

export const captureShareElement = async (
  element: HTMLElement,
): Promise<Blob> => {
  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 2,
    skipFonts: true,
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

  window.Kakao?.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: options.title,
      description: options.description,
      imageUrl: options.imageUrl,
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

export const shareImageFile = async (blob: Blob, title: string) => {
  if (!navigator.share || !navigator.canShare) {
    throw new Error('이 기기에서는 공유를 지원하지 않습니다.');
  }
  const file = new File([blob], 'pouch-share.png', { type: 'image/png' });
  if (!navigator.canShare({ files: [file] })) {
    throw new Error('이미지 공유를 지원하지 않습니다.');
  }
  await navigator.share({ title, files: [file] });
};

/**
 * 브라우저 이미지 캐시를 미리 채워 전환 직후 Next/Image 디코딩을 줄입니다.
 */
import { resolveDisplayImageSrc } from '@/lib/next-image-src';

const DEFAULT_CONCURRENCY = 4;

export type PreloadImageOptions = {
  /** 최대 preload 장수 (미지정 시 connection budget) */
  limit?: number;
};

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

const getConnectionBudget = (): number => {
  if (typeof navigator === 'undefined') {
    return 48;
  }
  const connection = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  if (connection?.saveData) {
    return 12;
  }
  const effectiveType = connection?.effectiveType ?? '';
  if (effectiveType.includes('2g')) {
    return 12;
  }
  if (effectiveType.includes('3g')) {
    return 24;
  }
  return 48;
};

const isPreloadableSrc = (raw: string): boolean => {
  const u = raw.trim();
  if (!u) {
    return false;
  }
  return u.startsWith('/') || /^https?:\/\//i.test(u);
};

const toAbsoluteSrc = (src: string): string => {
  const u = src.trim();
  if (u.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${u}`;
  }
  return u;
};

const preloadOne = (abs: string): Promise<void> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.decoding = 'async';
    const finish = () => {
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = abs;
  });
};

const runWithConcurrency = async (
  tasks: Array<() => Promise<void>>,
  concurrency: number,
): Promise<void> => {
  if (tasks.length === 0) {
    return;
  }
  let index = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    async () => {
      while (index < tasks.length) {
        const current = index;
        index += 1;
        await tasks[current]();
      }
    },
  );
  await Promise.all(workers);
};

export const preloadImageSrcs = (
  urls: readonly string[],
  options?: PreloadImageOptions,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const limit = options?.limit ?? getConnectionBudget();
  const seen = new Set<string>();
  const tasks: Array<() => Promise<void>> = [];

  for (const raw of urls) {
    if (!isPreloadableSrc(raw)) {
      continue;
    }
    const resolved = resolveDisplayImageSrc(raw);
    const abs = toAbsoluteSrc(resolved);
    if (seen.has(abs)) {
      continue;
    }
    seen.add(abs);
    tasks.push(() => preloadOne(abs));
    if (seen.size >= limit) {
      break;
    }
  }

  void runWithConcurrency(tasks, DEFAULT_CONCURRENCY);
};

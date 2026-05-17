import { NextRequest, NextResponse } from 'next/server';

import { isAllowedMediaProxySource } from '@/lib/next-image-src';

const UPSTREAM_TIMEOUT_MS = 30_000;

const resolveProxiedContentType = (
  rawUrl: string,
  upstreamContentType: string | null,
): string => {
  const fromHeader =
    upstreamContentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (fromHeader.startsWith('image/')) {
    return fromHeader;
  }
  try {
    const pathname = new URL(rawUrl).pathname.toLowerCase();
    if (pathname.endsWith('.svg')) {
      return 'image/svg+xml';
    }
    if (pathname.endsWith('.png')) {
      return 'image/png';
    }
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (pathname.endsWith('.webp')) {
      return 'image/webp';
    }
  } catch {
    // ignore
  }
  return fromHeader || 'application/octet-stream';
};

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')?.trim();
  if (!rawUrl || !isAllowedMediaProxySource(rawUrl)) {
    return NextResponse.json({ error: 'Invalid media url' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, UPSTREAM_TIMEOUT_MS);

  const isDev = process.env.NODE_ENV !== 'production';

  try {
    const upstream = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
      cache: isDev ? 'no-store' : 'force-cache',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream request failed' },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const contentType = resolveProxiedContentType(
      rawUrl,
      upstream.headers.get('content-type'),
    );
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cross-Origin-Resource-Policy': 'same-site',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}

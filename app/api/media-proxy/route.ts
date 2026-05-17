import { NextRequest, NextResponse } from 'next/server';

import { isAllowedMediaProxySource } from '@/lib/next-image-src';

const UPSTREAM_TIMEOUT_MS = 15_000;

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')?.trim();
  if (!rawUrl || !isAllowedMediaProxySource(rawUrl)) {
    return NextResponse.json({ error: 'Invalid media url' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
      cache: 'force-cache',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream request failed' },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const contentType =
      upstream.headers.get('content-type')?.split(';')[0]?.trim() ??
      'application/octet-stream';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { resolveServerAccessToken } from '@/lib/server-access-token';
import { getServerApiBase } from '@/lib/server-api-base';

type RouteContext = {
  params: Promise<{ wappenId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { wappenId: wappenIdParam } = await context.params;
  const wappenId = Number.parseInt(wappenIdParam, 10);
  if (!Number.isFinite(wappenId) || wappenId <= 0) {
    return NextResponse.json({ error: 'Invalid wappen id' }, { status: 400 });
  }

  const accessToken = await resolveServerAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiBase = getServerApiBase();
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase}/api/wappens/${wappenId}/image`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'image/*,*/*;q=0.8',
      },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch wappen image' },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const status =
      upstream.status === 404
        ? 404
        : upstream.status === 403
          ? 403
          : upstream.status >= 500
            ? 502
            : upstream.status;
    return NextResponse.json(
      { error: 'Failed to fetch wappen image' },
      { status },
    );
  }

  const contentType =
    upstream.headers.get('content-type')?.split(';')[0]?.trim() ??
    'image/png';
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

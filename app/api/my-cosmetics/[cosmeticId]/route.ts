import { type NextRequest, NextResponse } from 'next/server';

import { getServerApiBase } from '@/lib/server-api-base';
import {
  forwardProxyAuthHeaders,
  parseBackendProxyResponse,
  proxyMultipartPatch,
} from '@/lib/multipart-api-proxy';

const API_BASE = getServerApiBase();

type RouteParams = { params: Promise<{ cosmeticId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { cosmeticId } = await params;
  const targetUrl = `${API_BASE}/api/my-cosmetics/${cosmeticId}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: forwardProxyAuthHeaders(request),
    });
    return parseBackendProxyResponse(response, 'my-cosmetics/[id]');
  } catch (error) {
    console.error('[my-cosmetics/[id]][GET] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { cosmeticId } = await params;
  const targetUrl = `${API_BASE}/api/my-cosmetics/${cosmeticId}`;
  return proxyMultipartPatch(request, targetUrl, 'my-cosmetics/[id]');
}

export const maxDuration = 120;

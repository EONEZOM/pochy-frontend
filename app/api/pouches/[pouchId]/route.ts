import { type NextRequest, NextResponse } from 'next/server';

import {
  forwardProxyAuthHeaders,
  parseBackendProxyResponse,
  proxyMultipartPatch,
} from '@/lib/multipart-api-proxy';
import { getServerApiBase } from '@/lib/server-api-base';

const API_BASE = getServerApiBase();

type RouteParams = { params: Promise<{ pouchId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { pouchId } = await params;
  const targetUrl = `${API_BASE}/api/pouches/${pouchId}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: forwardProxyAuthHeaders(request),
    });
    return parseBackendProxyResponse(response, 'pouches/[pouchId]');
  } catch (error) {
    console.error('[pouches/[pouchId]][GET] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { pouchId } = await params;
  const targetUrl = `${API_BASE}/api/pouches/${pouchId}`;
  return proxyMultipartPatch(request, targetUrl, 'pouches/[pouchId]');
}

export const maxDuration = 60;

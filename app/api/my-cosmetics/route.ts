import { type NextRequest, NextResponse } from 'next/server';

import { getServerApiBase } from '@/lib/server-api-base';
import {
  forwardProxyAuthHeaders,
  parseBackendProxyResponse,
  proxyMultipartPost,
} from '@/lib/multipart-api-proxy';

const API_BASE = getServerApiBase();
const BACKEND_URL = `${API_BASE}/api/my-cosmetics`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targetUrl = new URL(BACKEND_URL);
  searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: forwardProxyAuthHeaders(request),
    });
    return parseBackendProxyResponse(response, 'my-cosmetics');
  } catch (error) {
    console.error('[my-cosmetics][GET] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  return proxyMultipartPost(request, BACKEND_URL, 'my-cosmetics');
}

export async function DELETE(request: NextRequest) {
  try {
    const headers = forwardProxyAuthHeaders(request);
    const init: RequestInit = {
      method: 'DELETE',
      headers,
    };

    const payload = await request.text();
    if (payload.length > 0) {
      headers.set('Content-Type', 'application/json');
      init.body = payload;
    }

    const response = await fetch(BACKEND_URL, init);
    return parseBackendProxyResponse(response, 'my-cosmetics');
  } catch (error) {
    console.error('[my-cosmetics][DELETE] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export const maxDuration = 120;

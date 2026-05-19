import { type NextRequest, NextResponse } from 'next/server';

import {
  forwardProxyAuthHeaders,
  parseBackendProxyResponse,
  proxyMultipartPost,
} from '@/lib/multipart-api-proxy';
import { getServerApiBase } from '@/lib/server-api-base';

const API_BASE = getServerApiBase();
const BACKEND_URL = `${API_BASE}/api/pouches`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targetUrl = new URL(BACKEND_URL);
  searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: forwardProxyAuthHeaders(request),
    });
    return parseBackendProxyResponse(response, 'pouches');
  } catch (error) {
    console.error('[pouches][GET] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

/** multipart POST — Vercel rewrite 대신 JSON @RequestPart Content-Type 보장 */
export async function POST(request: NextRequest) {
  return proxyMultipartPost(request, BACKEND_URL, 'pouches');
}

export const maxDuration = 60;

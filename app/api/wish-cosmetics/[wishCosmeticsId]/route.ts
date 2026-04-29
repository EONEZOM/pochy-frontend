import { type NextRequest, NextResponse } from 'next/server';

const normalizeApiBase = (value?: string) => {
  if (!value) return '';
  return value
    .replace(/\/$/, '')
    .replace(/\/v3\/api-docs$/, '')
    .replace(/\/api$/, '');
};

const FALLBACK_API_BASE = 'http://pochy.shop:8080';
const API_BASE =
  normalizeApiBase(process.env.NEXT_PUBLIC_API_URL) ||
  normalizeApiBase(process.env.OPENAPI_BASE_URL) ||
  FALLBACK_API_BASE;

const forwardHeaders = (request: NextRequest): HeadersInit => {
  const headers: Record<string, string> = {};
  const authorization = request.headers.get('Authorization');
  if (authorization) {
    headers['Authorization'] = authorization;
  }
  return headers;
};

type RouteParams = { params: Promise<{ wishCosmeticsId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { wishCosmeticsId } = await params;
  const targetUrl = `${API_BASE}/api/wish-cosmetics/${wishCosmeticsId}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: forwardHeaders(request),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[wish-cosmetics/[id]][GET] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { wishCosmeticsId } = await params;
  const targetUrl = `${API_BASE}/api/wish-cosmetics/${wishCosmeticsId}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: forwardHeaders(request),
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (error) {
    console.error('[wish-cosmetics/[id]][DELETE] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export const maxDuration = 30;

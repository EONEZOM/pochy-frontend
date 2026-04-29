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

const BACKEND_URL = `${API_BASE}/api/wish-cosmetics`;

const forwardHeaders = (request: NextRequest): HeadersInit => {
  const headers: Record<string, string> = {};
  const authorization = request.headers.get('Authorization');
  if (authorization) {
    headers['Authorization'] = authorization;
  }
  // Content-Type은 명시하지 않습니다.
  // multipart/form-data boundary는 브라우저(fetch)가 body와 함께 자동 설정합니다.
  return headers;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targetUrl = new URL(BACKEND_URL);
  searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: forwardHeaders(request),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[wish-cosmetics][GET] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: forwardHeaders(request),
      // ReadableStream을 그대로 전달해 multipart boundary를 보존합니다.
      body: request.body,
      // Node.js 18+ / Next.js 15+ 에서 스트리밍 body 전달 시 필요합니다.
      // @ts-expect-error duplex는 타입 정의에 없지만 런타임에 필요합니다.
      duplex: 'half',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[wish-cosmetics][POST] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const wishCosmeticsId = request.nextUrl.searchParams.get('id');
  const targetUrl = wishCosmeticsId
    ? `${API_BASE}/api/wish-cosmetics/${wishCosmeticsId}`
    : BACKEND_URL;

  try {
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: forwardHeaders(request),
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (error) {
    console.error('[wish-cosmetics][DELETE] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

// Vercel Serverless 함수 body 사이즈 제한을 늘립니다. (기본 4.5MB → 10MB)
export const maxDuration = 30;

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

const forwardHeaders = (request: NextRequest, includeContentType = false): Headers => {
  const headers = new Headers();
  const authorization = request.headers.get('Authorization');
  if (authorization) {
    headers.set('Authorization', authorization);
  }
  if (includeContentType) {
    // 서버→백엔드 구간에서 ReadableStream body를 그대로 전달할 때는
    // boundary가 포함된 Content-Type을 반드시 명시해야 Spring @RequestPart가 파싱할 수 있습니다.
    const contentType = request.headers.get('Content-Type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
  }
  return headers;
};

const parseResponse = async (response: Response): Promise<NextResponse> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }
  const text = await response.text();
  console.error('[wish-cosmetics] backend non-json response:', text.slice(0, 300));
  return NextResponse.json(
    { error: 'Backend non-json response', detail: text.slice(0, 300) },
    { status: response.status },
  );
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
    return parseResponse(response);
  } catch (error) {
    console.error('[wish-cosmetics][GET] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      // boundary가 포함된 Content-Type을 백엔드에 그대로 전달합니다.
      headers: forwardHeaders(request, true),
      body: request.body,
      // Node.js 18+ 에서 스트리밍 body 전달 시 필요합니다.
      // @ts-expect-error duplex는 타입 정의에 없지만 런타임에 필요합니다.
      duplex: 'half',
    });
    return parseResponse(response);
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
    return parseResponse(response);
  } catch (error) {
    console.error('[wish-cosmetics][DELETE] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

// Vercel Serverless 함수 body 사이즈 제한을 늘립니다. (기본 4.5MB → 10MB)
export const maxDuration = 30;

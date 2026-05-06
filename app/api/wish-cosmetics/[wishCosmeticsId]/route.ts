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

const forwardHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();
  const authorization = request.headers.get('Authorization');
  if (authorization) {
    headers.set('Authorization', authorization);
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
  console.error('[wish-cosmetics/[id]] backend non-json response:', text.slice(0, 300));
  return NextResponse.json(
    { error: 'Backend non-json response', detail: text.slice(0, 300) },
    { status: response.status },
  );
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
    return parseResponse(response);
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
    return parseResponse(response);
  } catch (error) {
    console.error('[wish-cosmetics/[id]][DELETE] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { wishCosmeticsId } = await params;
  const targetUrl = `${API_BASE}/api/wish-cosmetics/${wishCosmeticsId}`;

  try {
    const authorization = request.headers.get('Authorization');
    const forwardingHeaders: Record<string, string> = {};
    if (authorization) {
      forwardingHeaders.Authorization = authorization;
    }

    const contentType = request.headers.get('Content-Type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const incomingFormData = await request.formData();
      const outgoingFormData = new FormData();

      incomingFormData.forEach((value, key) => {
        outgoingFormData.append(key, value);
      });

      const response = await fetch(targetUrl, {
        method: 'PATCH',
        headers: forwardingHeaders,
        body: outgoingFormData,
      });
      return parseResponse(response);
    }

    const body = (await request.json()) as { request?: unknown };
    const requestDto = body?.request ?? body;
    const outgoingFormData = new FormData();

    outgoingFormData.append(
      'request',
      new Blob([JSON.stringify(requestDto)], { type: 'application/json' }),
    );

    const response = await fetch(targetUrl, {
      method: 'PATCH',
      headers: forwardingHeaders,
      body: outgoingFormData,
    });
    return parseResponse(response);
  } catch (error) {
    console.error('[wish-cosmetics/[id]][PATCH] proxy error:', error);
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export const maxDuration = 30;

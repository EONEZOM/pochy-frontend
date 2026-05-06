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
  console.log('[wish-cosmetics][POST] ▶ 요청 시작');
  console.log('[wish-cosmetics][POST] Content-Type:', request.headers.get('Content-Type'));
  console.log('[wish-cosmetics][POST] Authorization:', request.headers.get('Authorization') ? '있음' : '없음 ⚠️');
  console.log('[wish-cosmetics][POST] 백엔드 URL:', BACKEND_URL);

  try {
    // Step 1: 브라우저에서 보낸 FormData를 서버에서 파싱합니다.
    console.log('[wish-cosmetics][POST] Step 1: formData() 파싱 시작');
    const incomingFormData = await request.formData();
    console.log('[wish-cosmetics][POST] Step 1: formData() 파싱 완료. 키 목록:', [...incomingFormData.keys()]);

    // Step 2: 백엔드로 보낼 새 FormData 객체를 조립합니다.
    // fetch(FormData)는 Content-Type + boundary를 자동 생성하므로 직접 설정하지 않습니다.
    console.log('[wish-cosmetics][POST] Step 2: 새 FormData 조립 시작');
    const outgoingFormData = new FormData();
    incomingFormData.forEach((value, key) => {
      outgoingFormData.append(key, value);
      if (value instanceof File) {
        console.log(`  - [File] key="${key}" name="${value.name}" size=${value.size} type="${value.type}"`);
      } else {
        console.log(`  - [Field] key="${key}" value="${String(value).slice(0, 100)}"`);
      }
    });
    console.log('[wish-cosmetics][POST] Step 2: 조립 완료');

    // Step 3: 백엔드로 전송합니다.
    console.log('[wish-cosmetics][POST] Step 3: 백엔드 fetch 시작');
    const authorization = request.headers.get('Authorization');
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        // Content-Type은 fetch가 FormData body를 보고 자동 설정합니다.
      },
      body: outgoingFormData,
    });
    console.log('[wish-cosmetics][POST] Step 3: 백엔드 응답 수신. status:', response.status);
    console.log('[wish-cosmetics][POST] Step 3: 응답 Content-Type:', response.headers.get('content-type'));

    return parseResponse(response);
  } catch (error) {
    console.error('[wish-cosmetics][POST] ❌ 에러 발생:', error);
    console.error('[wish-cosmetics][POST] 에러 메시지:', error instanceof Error ? error.message : String(error));
    console.error('[wish-cosmetics][POST] 에러 스택:', error instanceof Error ? error.stack : '없음');
    return NextResponse.json(
      { error: 'Proxy request failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
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

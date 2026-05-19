import { type NextRequest, NextResponse } from 'next/server';

/** Spring @RequestPart JSON 파트 키 */
const JSON_REQUEST_PART_KEYS = new Set(['request', 'data']);

/**
 * Next Route Handler에서 파싱한 FormData를 백엔드로 재전송할 때
 * JSON 파트에 application/json Content-Type을 보장합니다.
 */
export const rebuildMultipartFormData = async (
  incoming: FormData,
): Promise<FormData> => {
  const outgoing = new FormData();

  for (const [key, value] of incoming.entries()) {
    if (JSON_REQUEST_PART_KEYS.has(key)) {
      if (typeof value === 'string') {
        outgoing.append(
          key,
          new Blob([value], { type: 'application/json' }),
        );
        continue;
      }
      if (value instanceof Blob) {
        const buffer = await value.arrayBuffer();
        outgoing.append(
          key,
          new Blob([buffer], { type: 'application/json' }),
        );
        continue;
      }
    }
    outgoing.append(key, value);
  }

  return outgoing;
};

export const forwardProxyAuthHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();
  const authorization = request.headers.get('Authorization');
  if (authorization) {
    headers.set('Authorization', authorization);
  }
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    headers.set('Cookie', cookie);
  }
  return headers;
};

export const parseBackendProxyResponse = async (
  response: Response,
  logLabel: string,
): Promise<NextResponse> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }
  const text = await response.text();
  console.error(`[${logLabel}] backend non-json response:`, text.slice(0, 300));
  return NextResponse.json(
    { error: 'Backend non-json response', detail: text.slice(0, 300) },
    { status: response.status },
  );
};

export const proxyMultipartPost = async (
  request: NextRequest,
  backendUrl: string,
  logLabel: string,
): Promise<NextResponse> => {
  try {
    const incomingFormData = await request.formData();
    const outgoingFormData = await rebuildMultipartFormData(incomingFormData);
    const authorization = request.headers.get('Authorization');

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: outgoingFormData,
    });

    return parseBackendProxyResponse(response, logLabel);
  } catch (error) {
    console.error(`[${logLabel}][POST] proxy error:`, error);
    return NextResponse.json(
      {
        error: 'Proxy request failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
};

export const proxyMultipartPatch = async (
  request: NextRequest,
  backendUrl: string,
  logLabel: string,
): Promise<NextResponse> => {
  try {
    const authorization = request.headers.get('Authorization');
    const forwardingHeaders: Record<string, string> = {};
    if (authorization) {
      forwardingHeaders.Authorization = authorization;
    }

    const contentType = request.headers.get('Content-Type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const incomingFormData = await request.formData();
      const outgoingFormData = await rebuildMultipartFormData(incomingFormData);
      const response = await fetch(backendUrl, {
        method: 'PATCH',
        headers: forwardingHeaders,
        body: outgoingFormData,
      });
      return parseBackendProxyResponse(response, logLabel);
    }

    const body = (await request.json()) as { request?: unknown };
    const requestDto = body?.request ?? body;
    const outgoingFormData = new FormData();
    outgoingFormData.append(
      'request',
      new Blob([JSON.stringify(requestDto)], { type: 'application/json' }),
    );

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: forwardingHeaders,
      body: outgoingFormData,
    });
    return parseBackendProxyResponse(response, logLabel);
  } catch (error) {
    console.error(`[${logLabel}][PATCH] proxy error:`, error);
    return NextResponse.json(
      {
        error: 'Proxy request failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
};

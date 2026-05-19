import { type NextRequest, NextResponse } from 'next/server';

/** Spring @RequestPart JSON 파트 키 */
const JSON_REQUEST_PART_KEYS = new Set(['request', 'data']);

const DEFAULT_JSON_PART_FILE_NAME = 'request.json';

const resolveJsonPartFileName = (value: Blob): string => {
  if (value instanceof File && value.name.trim()) {
    return value.name;
  }
  return DEFAULT_JSON_PART_FILE_NAME;
};

const appendJsonPart = (
  outgoing: FormData,
  key: string,
  payload: string | ArrayBuffer,
  fileName: string,
) => {
  const body = typeof payload === 'string' ? payload : new Uint8Array(payload);
  outgoing.append(
    key,
    new File([body], fileName, { type: 'application/json' }),
  );
};

/**
 * Next Route Handler에서 파싱한 FormData를 백엔드로 재전송할 때
 * JSON 파트에 application/json Content-Type과 파일명을 보장합니다.
 */
export const rebuildMultipartFormData = async (
  incoming: FormData,
): Promise<FormData> => {
  const outgoing = new FormData();

  for (const [key, value] of incoming.entries()) {
    if (JSON_REQUEST_PART_KEYS.has(key)) {
      if (typeof value === 'string') {
        appendJsonPart(outgoing, key, value, DEFAULT_JSON_PART_FILE_NAME);
        continue;
      }
      if (value instanceof Blob) {
        const buffer = await value.arrayBuffer();
        appendJsonPart(
          outgoing,
          key,
          buffer,
          resolveJsonPartFileName(value),
        );
        continue;
      }
    }
    outgoing.append(key, value);
  }

  return outgoing;
};

export const logIncomingMultipartFormData = (
  formData: FormData,
  logLabel: string,
  method = 'POST',
): void => {
  console.log(`[${logLabel}][${method}] FormData keys:`, [...formData.keys()]);
  formData.forEach((value, key) => {
    if (typeof value === 'string') {
      console.log(
        `[${logLabel}][${method}] part key="${key}" value="${value.slice(0, 120)}"`,
      );
      return;
    }
    console.log(
      `[${logLabel}][${method}] part key="${key}" file="${value.name}" size=${value.size} type="${value.type}"`,
    );
  });
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
    if (!response.ok) {
      console.error(
        `[${logLabel}] backend error status=${response.status}:`,
        JSON.stringify(data).slice(0, 800),
      );
    }
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
    logIncomingMultipartFormData(incomingFormData, logLabel, 'POST');
    const outgoingFormData = await rebuildMultipartFormData(incomingFormData);
    const authorization = request.headers.get('Authorization');

    console.log(`[${logLabel}][POST] forwarding to backend:`, backendUrl);

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
      new File([JSON.stringify(requestDto)], DEFAULT_JSON_PART_FILE_NAME, {
        type: 'application/json',
      }),
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

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
 * wish-cosmetics 프록시와 동일 — 파싱된 파트를 그대로 복사합니다.
 * rebuild 시 File/Blob 메타가 깨져 Spring @RequestPart가 500을 내는 경우를 방지합니다.
 */
export const copyMultipartFormData = (incoming: FormData): FormData => {
  const outgoing = new FormData();
  incoming.forEach((value, key) => {
    outgoing.append(key, value);
  });
  return outgoing;
};

/**
 * JSON 파트가 plain string으로만 온 경우에만 File로 보정합니다.
 */
export const prepareMultipartFormDataForBackend = async (
  incoming: FormData,
): Promise<FormData> => {
  const outgoing = new FormData();
  let needsFix = false;

  for (const [key, value] of incoming.entries()) {
    if (JSON_REQUEST_PART_KEYS.has(key) && typeof value === 'string') {
      needsFix = true;
      break;
    }
  }

  if (!needsFix) {
    return copyMultipartFormData(incoming);
  }

  for (const [key, value] of incoming.entries()) {
    if (JSON_REQUEST_PART_KEYS.has(key) && typeof value === 'string') {
      appendJsonPart(outgoing, key, value, DEFAULT_JSON_PART_FILE_NAME);
      continue;
    }
    if (JSON_REQUEST_PART_KEYS.has(key) && value instanceof File) {
      const buffer = await value.arrayBuffer();
      appendJsonPart(
        outgoing,
        key,
        buffer,
        resolveJsonPartFileName(value),
      );
      continue;
    }
    outgoing.append(key, value);
  }

  return outgoing;
};

/** @deprecated prepareMultipartFormDataForBackend 또는 copyMultipartFormData 사용 */
export const rebuildMultipartFormData = prepareMultipartFormDataForBackend;

const readJsonRequestPartText = async (
  formData: FormData,
): Promise<string | null> => {
  for (const key of JSON_REQUEST_PART_KEYS) {
    const value = formData.get(key);
    if (value == null) {
      continue;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Blob) {
      return value.text();
    }
  }
  return null;
};

export const logJsonRequestPartPreview = async (
  formData: FormData,
  logLabel: string,
  method: string,
): Promise<void> => {
  try {
    const raw = await readJsonRequestPartText(formData);
    if (!raw) {
      return;
    }
    console.log(
      `[${logLabel}][${method}] request part preview:`,
      raw.slice(0, 1200),
    );
  } catch (error) {
    console.error(`[${logLabel}][${method}] request part preview failed:`, error);
  }
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
    await logJsonRequestPartPreview(incomingFormData, logLabel, 'POST');
    const outgoingFormData =
      await prepareMultipartFormDataForBackend(incomingFormData);
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
      logIncomingMultipartFormData(incomingFormData, logLabel, 'PATCH');
      await logJsonRequestPartPreview(incomingFormData, logLabel, 'PATCH');
      const outgoingFormData =
        await prepareMultipartFormDataForBackend(incomingFormData);
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

import { type NextRequest } from 'next/server';

import { proxyMultipartPatch } from '@/lib/multipart-api-proxy';
import { getServerApiBase } from '@/lib/server-api-base';

const API_BASE = getServerApiBase();

type RouteParams = { params: Promise<{ pouchId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { pouchId } = await params;
  const targetUrl = `${API_BASE}/api/pouches/${pouchId}/image`;
  return proxyMultipartPatch(request, targetUrl, 'pouches/[pouchId]/image');
}

export const maxDuration = 60;

import { type NextRequest } from 'next/server';

import { getServerApiBase } from '@/lib/server-api-base';
import { proxyMultipartPost } from '@/lib/multipart-api-proxy';

const BACKEND_URL = `${getServerApiBase()}/api/my-cosmetics/direct`;

export async function POST(request: NextRequest) {
  return proxyMultipartPost(request, BACKEND_URL, 'my-cosmetics/direct');
}

export const maxDuration = 120;

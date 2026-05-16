const normalizeApiBase = (value?: string) => {
  if (!value) {
    return '';
  }
  return value
    .replace(/\/$/, '')
    .replace(/\/v3\/api-docs$/, '')
    .replace(/\/api$/, '');
};

const FALLBACK_API_BASE = 'http://pochy.shop:8080';

/** 서버(Route Handler·middleware)에서 백엔드 origin */
export const getServerApiBase = (): string => {
  const runtimeApiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
  const openApiBase = normalizeApiBase(process.env.OPENAPI_BASE_URL);
  return runtimeApiBase || openApiBase || FALLBACK_API_BASE;
};

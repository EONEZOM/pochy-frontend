import axios, { AxiosHeaders, AxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL;
if (!baseURL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined');
}

const ACCESS_TOKEN_STORAGE_KEY = 'ACCESS_TOKEN';

export const axiosInstance = axios.create({
  baseURL: '/',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryableAxiosRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

let reissuePromise: Promise<void> | null = null;
let accessToken: string | null = null;

const isBrowser = () => typeof window !== 'undefined';

const readStoredAccessToken = (): string | null => {
  if (!isBrowser()) return null;
  const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  return token && token.trim().length > 0 ? token : null;
};

const persistAccessToken = (token: string | null) => {
  accessToken = token;
  if (!isBrowser()) return;
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

const getAccessToken = (): string | null => {
  if (accessToken) return accessToken;
  const storedToken = readStoredAccessToken();
  if (storedToken) {
    accessToken = storedToken;
    return storedToken;
  }
  return null;
};

const extractAccessToken = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Record<string, unknown>;
  const keys = ['accessToken', 'access_token', 'token'];
  for (const key of keys) {
    const token = candidate[key];
    if (typeof token === 'string' && token.trim().length > 0) {
      return token.trim();
    }
  }

  // 응답 구조가 중첩된 경우(result.tokenDto.accessToken 등)까지 탐색합니다.
  for (const nestedValue of Object.values(candidate)) {
    const nestedToken = extractAccessToken(nestedValue);
    if (nestedToken) return nestedToken;
  }
  return null;
};

const requestReissue = async () => {
  const response = await axiosInstance.post('/api/auth/reissue');
  const tokenFromBody = extractAccessToken(response?.data?.result);
  const tokenFromHeader = extractAccessToken(
    response?.headers?.authorization?.replace?.(/^Bearer\s+/i, ''),
  );
  const nextAccessToken = tokenFromBody ?? tokenFromHeader;
  if (!nextAccessToken) {
    throw new Error('Token reissue succeeded but no token found in response');
  }
  persistAccessToken(nextAccessToken);
};

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  const isFormData =
    typeof FormData !== 'undefined' && config.data instanceof FormData;

  if (isFormData) {
    // FormData는 브라우저가 boundary 포함 Content-Type을 자동으로 설정해야 한다.
    // (orval/기본 axios 헤더와 충돌하지 않도록 대소문자 모두 제거)
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Content-Type', undefined);
      config.headers.set('content-type', undefined);
    }
    if (config.headers && typeof config.headers === 'object') {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
      delete (config.headers as Record<string, unknown>)['content-type'];
    }
  }

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const responseUrl = response?.config?.url ?? '';
    if (responseUrl.includes('/api/auth/logout')) {
      persistAccessToken(null);
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as
      | RetryableAxiosRequestConfig
      | undefined;
    const requestUrl = originalRequest?.url ?? '';
    const shouldRetryByStatus = status === 401 || status === 403;

    const shouldSkipReissue =
      !originalRequest ||
      originalRequest._retry ||
      !shouldRetryByStatus ||
      requestUrl.includes('/api/auth/reissue') ||
      requestUrl.includes('/api/auth/logout');

    if (requestUrl.includes('/api/auth/logout')) {
      persistAccessToken(null);
    }

    if (shouldSkipReissue) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!reissuePromise) {
        reissuePromise = requestReissue().finally(() => {
          reissuePromise = null;
        });
      }
      await reissuePromise;
      return axiosInstance(originalRequest);
    } catch (reissueError) {
      persistAccessToken(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(reissueError);
    }
  },
);

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return axiosInstance({ ...config, ...options }).then(
    (response) => response.data,
  );
};

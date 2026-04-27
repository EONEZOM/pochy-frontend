import axios, { AxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL;
if (!baseURL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined');
}

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

const requestReissue = async () => {
  await axiosInstance.post('/api/auth/reissue');
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as RetryableAxiosRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? '';

    const shouldSkipReissue =
      !originalRequest ||
      originalRequest._retry ||
      status !== 401 ||
      requestUrl.includes('/api/auth/reissue') ||
      requestUrl.includes('/api/auth/logout');

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

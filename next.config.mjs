/** @type {import('next').NextConfig} */
const runtimeApiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
const openApiBase = process.env.OPENAPI_BASE_URL?.replace(/\/$/, '');
const normalizedOpenApiBase = openApiBase?.replace(/\/v3\/api-docs$/, '');
const apiBase = runtimeApiBase || normalizedOpenApiBase || '';

if (!apiBase) {
  throw new Error('NEXT_PUBLIC_API_URL or OPENAPI_BASE_URL is required');
}

const nextConfig = {
  // Turbopack is the default in Next.js 16. Keep this key to avoid
  // "webpack config with no turbopack config" build errors.
  turbopack: {},

  // 1) Webpack aliases for client build safety.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp$: false,
        'onnxruntime-node$': false,
      };
    }
    return config;
  },

  // 2) Security headers for SharedArrayBuffer-enabled workloads.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },

  /** (auth) route group: 실제 URL은 /verify, /success */
  async redirects() {
    return [
      { source: '/auth/verify', destination: '/verify', permanent: false },
      { source: '/auth/success', destination: '/success', permanent: false },
    ];
  },

  async rewrites() {
    return [
      {
        // 프론트엔드에서 /api로 시작하는 모든 요청을
        source: '/api/:path*',
        // 실제 백엔드 서버 주소로 매핑
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },

  // 3) Remote image allowlist for Naver hosts.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'shopping-phinf.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: 'search.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: '**.pstatic.net',
      },
    ],
  },

  reactStrictMode: true,
};

export default nextConfig;

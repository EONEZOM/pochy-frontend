/** @type {import('next').NextConfig} */
const normalizeApiBase = (value) => {
  if (!value) {
    return '';
  }
  return value.replace(/\/$/, '').replace(/\/v3\/api-docs$/, '').replace(/\/api$/, '');
};

const runtimeApiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
const openApiBase = normalizeApiBase(process.env.OPENAPI_BASE_URL);
const apiBase = runtimeApiBase || openApiBase || '';

if (!apiBase) {
  throw new Error('NEXT_PUBLIC_API_URL or OPENAPI_BASE_URL is required');
}

/** `.env` 의 API 오리진을 이미지 최적화 허용 목록에 넣습니다 (`resolveMediaUrl` 과 대응). */
function tryRemotePatternFromApiBase(base) {
  if (!base || !/^https?:\/\//i.test(base)) {
    return null;
  }
  try {
    const u = new URL(base);
    const pattern = {
      protocol: u.protocol.replace(':', ''),
      hostname: u.hostname,
      pathname: '/**',
    };
    if (u.port) {
      pattern.port = u.port;
    }
    return pattern;
  } catch {
    return null;
  }
}

const apiOriginRemotePattern = tryRemotePatternFromApiBase(apiBase);

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

  // 2) COOP/COEP — ONNX Runtime Web(WASM) 등 크로스 오리진 격리가 필요한 화면만.
  // 전역 `/(.*)`에 두면 프로덕션에서 네이버 프로필·pstatic CDN 이미지가 CORP 미제공으로 차단됨.
  // 배포에서 원인 확인: 문서 응답 `cross-origin-embedder-policy`, Network에서 이미지 blocked reason.
  async headers() {
    const crossOriginIsolationHeaders = [
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'require-corp',
      },
    ];
    return [
      {
        source: '/my-cosmetics/register',
        headers: crossOriginIsolationHeaders,
      },
      {
        source: '/my-cosmetics/register/direct',
        headers: crossOriginIsolationHeaders,
      },
    ];
  },

  /** (auth) route group: 실제 URL은 /verify, /success */
  async redirects() {
    return [
      { source: '/auth/verify', destination: '/verify', permanent: false },
      { source: '/auth/success', destination: '/success', permanent: false },
      { source: '/auth/opening', destination: '/opening', permanent: false },
      { source: '/favicon.ico', destination: '/logo/nobg-logo-192.svg', permanent: false },
    ];
  },

  async rewrites() {
    return {
      afterFiles: [
        {
          // media-proxy·pouches·wappens/:id/image 등은 app/api Route Handler 우선. 그 외 /api/* 는 백엔드 rewrite
          source: '/api/:path((?!media-proxy).*)',
          destination: `${apiBase}/api/:path`,
        },
      ],
    };
  },

  // 3) Local·remote image allowlist (Next 16: Vercel Image Optimization은 localPatterns 미일치 시 400)
  images: {
    localPatterns: [
      { pathname: '/figma/**', search: '' },
      { pathname: '/icons/**', search: '' },
      { pathname: '/logo/**', search: '' },
      { pathname: '/images/**', search: '' },
    ],
    remotePatterns: [
      // 네이버 검색 API 쇼핑 이미지 도메인
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
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // 유튜브 썸네일 도메인
      },
      // 백엔드 API·상품 이미지 (HTTPS)
      {
        protocol: 'https',
        hostname: 'api.pochy.shop',
        pathname: '/**',
      },
      // 레거시 URL 호환
      {
        protocol: 'http',
        hostname: 'pochy.shop',
        port: '8080',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pochy.shop',
        pathname: '/**',
      },
      // 포치 백엔드 이미지 버켓 주소
      {
        protocol: 'https',
        hostname:
          'pochy-s3-bucket-538747156157-ap-northeast-2-an.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd3m6etzsbqm4vo.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        pathname: '/**',
      },
      ...(apiOriginRemotePattern ? [apiOriginRemotePattern] : []),
    ],
  },
  reactStrictMode: true,
};

export default nextConfig;

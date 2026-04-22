/** @type {import('next').NextConfig} */
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
      }
    }
    return config
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
    ]
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Unsplash 호스트 허용(mock 데이터)
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // 유튜브 썸네일 도메인
      },
    ],
  },

  reactStrictMode: true,
}

export default nextConfig

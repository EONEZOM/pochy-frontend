import { defaultCache } from "@serwist/next/worker";
import {
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    /** SW 스코프 오리진 비교용 — `self.location`은 일부 TS lib에서 SW 전역에 없음 */
    readonly registration: ServiceWorkerRegistration;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * 1×1 투명 PNG — 교차 출처 이미지 요청이 SW 안에서 실패할 때 Workbox `no-response` 대신 반환.
 * (COEP·CORS·오프라인 등으로 `fetch`가 깨져도 SW가 거부 Promise를 던지지 않게 함)
 */
const TRANSPARENT_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0,
  0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156,
  99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
  96, 130,
]);

/** `defaultCache`보다 먼저 매칭 — 외부 오리진은 캐시 전략을 섞지 않고 네트워크만 시도 */
const crossOriginNetworkOnly = new NetworkOnly({
  plugins: [
    {
      handlerDidError: async ({ request }) => {
        if (request.destination === "image") {
          return new Response(TRANSPARENT_PNG, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "no-store",
            },
          });
        }
        return new Response(null, { status: 204 });
      },
    },
  ],
});

const SAME_ORIGIN = new URL(self.registration.scope).origin;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        url.origin === "https://vercel.live" &&
        url.pathname === "/_next-live/feedback/feedback.js",
      handler: new NetworkOnly({
        plugins: [
          {
            handlerDidError: async () => {
              return new Response(null, { status: 204 });
            },
          },
        ],
      }),
    },
    {
      matcher: ({ url }) => url.origin !== SAME_ORIGIN,
      handler: crossOriginNetworkOnly,
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/",
        matcher: ({ request }) => {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

serwist.addEventListeners();

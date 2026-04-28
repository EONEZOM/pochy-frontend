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
  }
}

declare const self: ServiceWorkerGlobalScope;
  
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
              return new Response("", { status: 204 });
            },
          },
        ],
      }),
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

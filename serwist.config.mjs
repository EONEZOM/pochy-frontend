import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "workers/sw.ts",
  swDest: "public/sw.js",
});

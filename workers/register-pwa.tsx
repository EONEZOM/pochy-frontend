"use client";

import { SerwistProvider } from "@serwist/next/react";

export default function RegisterPWA() {
  const isProduction = process.env.NODE_ENV === "production";

  return <SerwistProvider disable={!isProduction} swUrl="/sw.js" />;
}

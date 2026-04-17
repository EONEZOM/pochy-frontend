"use client";

import { SerwistProvider } from "@serwist/next/react";

export default function RegisterPWA() {
  return <SerwistProvider swUrl="/sw.js" />;
}

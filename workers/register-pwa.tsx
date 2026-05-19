"use client";

import { useEffect } from "react";
import { SerwistProvider } from "@serwist/next/react";

export default function RegisterPWA() {
  const isProduction = process.env.NODE_ENV === "production";

  useEffect(() => {
    if (isProduction || typeof navigator === "undefined") {
      return;
    }
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {});
  }, [isProduction]);

  return <SerwistProvider disable={!isProduction} swUrl="/sw.js" />;
}

"use client";

import { useEffect, useState } from "react";

/**
 * WebMCPProvider initializes the WebMCP global polyfill and web component.
 * It uses dynamic import to ensure client-side only execution.
 */
export function WebMCPProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Dynamically import to avoid SSR issues
    import("@/lib/webmcp-init").then(() => {
      setIsInitialized(true);
    });
  }, []);

  return <>{children}</>;
}

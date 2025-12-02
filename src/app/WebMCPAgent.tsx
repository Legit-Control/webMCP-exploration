"use client";

import { useEffect, useState } from "react";

export function WebMCPAgent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    // @ts-expect-error - webmcp-agent is a custom element
    <webmcp-agent
      app-id="big-calendar"
      api-base="https://webmcp-agent-playground.alexmnahas.workers.dev"
      view-mode="pill"
    />
  );
}

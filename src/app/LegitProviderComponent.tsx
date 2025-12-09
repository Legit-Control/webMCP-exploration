"use client";

import { LegitProvider } from "@legit-sdk/react/server";
import type { ReactNode } from "react";

export default function LegitProviderComponent({ children }: { children: ReactNode }): ReactNode {
  return <LegitProvider>{children}</LegitProvider>;
}

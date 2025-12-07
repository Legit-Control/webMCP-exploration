import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";

import { Analytics } from "@vercel/analytics/react";

import { inter } from "@/styles/fonts";

import { cn } from "@/lib/utils";

import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/toaster";

import { getTheme } from "@/cookies/get";

import MyProvider from "@/app/MyProvider";
import { WebMCPProvider } from "@/app/WebMCPProvider";
import { WebMCPAgent } from "@/app/WebMCPAgent";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Big Calendar by lramos33",
  description:
    "A feature-rich calendar application built with Next.js, TypeScript, and Tailwind CSS. This project provides a modern, responsive interface for managing events and schedules with multiple viewing options.",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();

  return (
    <html lang="en-US" className={cn(inter.variable, theme)}>
      <body>
        <Header />
        <Analytics />
        <Toaster />
        <WebMCPProvider>
          <MyProvider>{children}</MyProvider>
        </WebMCPProvider>
        <WebMCPAgent />
      </body>
    </html>
  );
}

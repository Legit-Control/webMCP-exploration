"use client";

import "@/styles/globals.css";

import { Analytics } from "@vercel/analytics/react";

import { inter } from "@/styles/fonts";

import { cn } from "@/lib/utils";

import { Header } from "@/components/layout/header";

import MyProvider from "@/app/MyProvider";
import { WebMCPProvider } from "@/app/WebMCPProvider";
import { WebMCPAgent } from "@/app/WebMCPAgent";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={cn(inter.variable)}>
      <head>
        <title>Big Calendar</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <Header />
        <Analytics />
        <WebMCPProvider>
          <MyProvider>{children}</MyProvider>
        </WebMCPProvider>
        <WebMCPAgent />
      </body>
    </html>
  );
}

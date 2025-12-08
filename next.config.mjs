import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  redirects: async () => [
    {
      source: "/",
      destination: "/month-view",
      permanent: false,
    },
  ],
  // Enable Turbopack (Next.js 16 default)
  turbopack: {},
};

initOpenNextCloudflareForDev();

export default nextConfig;

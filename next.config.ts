import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { globalNotFound: true },
  // Firebase sign-in handler served from our own domain (Chrome's storage partitioning breaks the popup when it runs on
  // firebaseapp.com — the popup finishes but never reports back): https://firebase.google.com/docs/auth/web/redirect-best-practices
  rewrites: async () => [{ source: "/__/:path*", destination: "https://printing-89be5.firebaseapp.com/__/:path*" }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

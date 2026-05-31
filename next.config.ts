import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The product catalog (~130 MB) is served as static assets and read by
  // the API route over HTTP, so it must NOT be bundled into the function.
  // Without this Vercel breaches its 250 MB serverless function limit.
  outputFileTracingExcludes: {
    "*": [
      "./public/catalog/**",
      "./.next/cache/**",
    ],
  },
};

export default nextConfig;

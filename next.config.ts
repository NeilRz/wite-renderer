import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow up to 25s on edge streaming routes (Hobby max).
  // Bundle product images straight from public/, no remote loader needed.
  experimental: {},
};

export default nextConfig;

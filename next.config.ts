import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a stray lockfile in a parent folder is never picked up.
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
};

export default nextConfig;

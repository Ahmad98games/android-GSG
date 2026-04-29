import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  serverExternalPackages: ['better-sqlite3', 'ws'],
};

export default nextConfig;

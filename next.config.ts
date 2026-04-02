import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Disable static generation entirely
  output: "standalone",
  trailingSlash: true,
  // Force dynamic rendering
  serverExternalPackages: [],
  // Disable static optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

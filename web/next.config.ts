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
  turbopack: {
    resolveAlias: {
      "@metamask/connect-evm": "./empty.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@metamask/connect-evm": "./empty.js",
    };
    return config;
  },
};

export default nextConfig;

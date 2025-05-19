import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compiler: {
    styledComponents: true,
  },
  // Explicitly pass environment variables to the browser
  env: {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // Transpile styled-components
  transpilePackages: ['styled-components'],
  // Disable React strict mode for now to troubleshoot issues
  reactStrictMode: false,
  // Disable ESLint checks during build for faster builds
  // This is only for production builds - development still uses ESLint
  eslint: {
    // Only ignore ESLint errors during production builds
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  // Add experimental optimizations to help with module resolution
  experimental: {
    optimizePackageImports: ['styled-components'],
    webpackBuildWorker: true, // Use worker for webpack builds
  },
};

export default nextConfig;
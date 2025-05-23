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
  // Transpile styled-components and react-pdf
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
  // Configure webpack for react-pdf
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    // Configure PDF.js worker handling
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    });

    return config;
  },
  
  // Add headers for better PDF handling
  async headers() {
    return [
      {
        source: '/pdf-worker/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/pdf-proxy',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
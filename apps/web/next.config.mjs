/** @type {import('next').NextConfig} */

/**
 * The browser always talks to same-origin `/api/v1/*`. Next.js rewrites that
 * to the Express API, which keeps cookies first-party and eliminates CORS
 * problems in every environment (local, sandbox preview, Railway).
 */
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ??
  process.env.NEXT_PUBLIC_API_ORIGIN ??
  'http://127.0.0.1:4000';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    // Linting runs as a separate CI step; never block a production build.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: process.env.NEXT_OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
      {
        source: '/healthz',
        destination: `${API_PROXY_TARGET}/api/v1/health`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // No X-Frame-Options / frame-ancestors on purpose: the dashboard is
          // designed to be embedded (sandbox preview, partner portals, docs).
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

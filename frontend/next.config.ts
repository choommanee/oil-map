import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gzip/Brotli compression on Next.js responses
  compress: true,

  // Remove X-Powered-By header (minor security + saves bytes)
  poweredByHeader: false,

  // HTTP cache headers for static assets
  async headers() {
    return [
      {
        // Brand logos and other public assets: cache 1 week
        source: '/brands/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, immutable' }],
      },
      {
        // GeoJSON boundaries: cache 1 day (rarely changes)
        source: '/:path*.geojson',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'webbcpopaprd001.azurewebsites.net',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
  },
};

export default nextConfig;

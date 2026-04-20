import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://stream-hub.duckdns.org:3001/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'https://stream-hub.duckdns.org:3001/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;

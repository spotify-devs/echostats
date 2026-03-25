/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
      },
      {
        protocol: "https",
        hostname: "*.spotifycdn.com",
      },
    ],
  },
  serverExternalPackages: [],
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  // Ensure env vars are available at runtime for standalone mode
  env: {
    INTERNAL_API_URL: process.env.INTERNAL_API_URL || "http://localhost:8000",
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || "dev",
  },
};

export default nextConfig;

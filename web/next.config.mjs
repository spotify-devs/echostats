/** @type {import('next').NextConfig} */
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^\/icons\/.*\.png$/,
        handler: "CacheFirst",
        options: { cacheName: "icons", expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } },
      },
      {
        urlPattern: /^\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: { cacheName: "static", expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 } },
      },
      {
        urlPattern: /^\/api\/v1\/.*$/,
        handler: "NetworkFirst",
        options: { cacheName: "api", networkTimeoutSeconds: 10, expiration: { maxAgeSeconds: 5 * 60 } },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "CacheFirst",
        options: { cacheName: "images", expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } },
      },
    ],
  },
});

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
  env: {
    INTERNAL_API_URL: process.env.INTERNAL_API_URL || "http://localhost:8000",
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || "dev",
  },
};

export default withPWA(nextConfig);

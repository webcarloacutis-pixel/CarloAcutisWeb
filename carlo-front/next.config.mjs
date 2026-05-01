/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const BACKEND =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://njnpudxawz.us-east-1.awsapprunner.com";

    return [
      { source: "/api/:path*", destination: BACKEND + "/api/:path*" },
      { source: "/ai/:path*", destination: BACKEND + "/ai/:path*" },

      { source: "/auth/:path*", destination: BACKEND + "/auth/:path*" },
      { source: "/conversations/:path*", destination: BACKEND + "/conversations/:path*" },

      { source: "/discover-saint", destination: BACKEND + "/discover-saint" },
      { source: "/descubrir-saint", destination: BACKEND + "/descubrir-saint" },

      { source: "/saints/:path*", destination: BACKEND + "/saints/:path*" },
      { source: "/prayers/:path*", destination: BACKEND + "/prayers/:path*" },
      { source: "/miracles/:path*", destination: BACKEND + "/miracles/:path*" },

      { source: "/health", destination: BACKEND + "/health" },
    ];
  },
};

export default nextConfig;

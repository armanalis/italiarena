/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app used to live under /dashboard: old bookmarks, shared challenge
  // links and notifications already sent keep working.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: true },
      { source: "/dashboard/statistics", destination: "/stats", permanent: true },
      { source: "/dashboard/recent-matches", destination: "/recent", permanent: true },
      { source: "/dashboard/:path*", destination: "/:path*", permanent: true },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;

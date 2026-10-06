import type { NextConfig } from "next";

// When BACKEND_URL is set (free-tier deployment), the browser talks only to the frontend origin
// and /api/* is proxied to the API, so the session cookie stays first-party.
const backendUrl = process.env.BACKEND_URL?.replace(/[/]$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return backendUrl ? [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }] : [];
  },
};

export default nextConfig;

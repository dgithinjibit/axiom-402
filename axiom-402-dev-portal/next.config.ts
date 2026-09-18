import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for catching subtle bugs.
  reactStrictMode: true,

  // Opt in to the App Router compiler.
  experimental: {
    typedRoutes: true,
  },

  // Proxy /api/derive → Rust Axum backend (Phase 4).
  // Update AXIOM_API_URL in .env.local to point at the running Rust server.
  async rewrites() {
    const apiUrl = process.env["AXIOM_API_URL"] ?? "http://localhost:3001";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;

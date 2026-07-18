import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lint is run separately via `npm run lint`; don't let lint warnings/errors
  // block production builds. (Type errors still fail the build.)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

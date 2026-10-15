import path from "node:path";
import type { NextConfig } from "next";

// A lockfile higher up the tree confuses Next's root detection locally; pin it to this app.
// Skipped on Vercel: there the pin breaks next/font/google resolution under Turbopack.
const root = path.join(__dirname);

const nextConfig: NextConfig = process.env.VERCEL
  ? {}
  : {
      outputFileTracingRoot: root,
      turbopack: { root },
    };

export default nextConfig;

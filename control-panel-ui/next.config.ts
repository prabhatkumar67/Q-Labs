import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactCompiler: true,
  // No floating dev badge over the UI; build errors still show in the overlay.
  devIndicators: false,
};

export default nextConfig;

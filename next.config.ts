import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop `next dev` from writing its own block into AGENTS.md (keeps the HW3 baseline rules-free).
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

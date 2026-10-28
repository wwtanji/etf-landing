import path from "node:path";
import type { NextConfig } from "next";
import { missingOperatorFields } from "./lib/site-config";

// Repo root: lets the build statically import ../data/etfs.json (plan §10).
const repoRoot = path.join(__dirname, "..");

// Production must not ship without operator identity (plan §5.7).
if (process.env.VERCEL_ENV === "production") {
  const missing = missingOperatorFields();
  if (missing.length > 0) {
    throw new Error(
      `Production build refused: fill web/lib/site-config.ts (${missing.join(", ")}).`,
    );
  }
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

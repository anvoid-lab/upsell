import { defineConfig } from "vitest/config";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors tsconfig.json paths — Vitest doesn't read tsconfig aliases itself.
      "@/": path.resolve(root, "./src/") + "/",
      "@core/": path.resolve(root, "./core/") + "/",
      "@db/": path.resolve(root, "./database/") + "/",
      // Next.js build-time-only module; see test/stubs/server-only.ts.
      "server-only": path.resolve(root, "./test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      // Hits the live Supabase project; run explicitly via `npm run test:integration`.
      "tests/integration/**",
    ],
  },
});

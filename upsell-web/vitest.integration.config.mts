import { defineConfig } from "vitest/config";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@/": path.resolve(root, "./src/") + "/",
      "@core/": path.resolve(root, "./core/") + "/",
      "@db/": path.resolve(root, "./supabase/") + "/",
      "server-only": path.resolve(root, "./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // RLS checks create/sign-in/delete a real auth user per run.
    testTimeout: 20_000,
  },
});

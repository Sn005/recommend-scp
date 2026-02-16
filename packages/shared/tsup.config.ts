import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/lib/env.ts",
    "src/lib/supabase.ts",
    "src/types.ts",
    "src/embedding/index.ts",
    "src/tagging/index.ts",
    "src/search/index.ts",
    "src/onboarding/index.ts",
    "src/storage/index.ts",
    "src/storage/server.ts",
    "src/recommendation/index.ts",
  ],
  format: ["esm"],
  target: "es2022",
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: true,
  external: ["@supabase/supabase-js", "openai", "dotenv", "find-up"],
});

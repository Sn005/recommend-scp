import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: true,
  noExternal: ["@recommend-scp/shared"],
  external: [
    "hono",
    "@hono/node-server",
    "@hono/zod-validator",
    "@supabase/supabase-js",
    "openai",
    "pino",
    "jsdom",
    "zod",
  ],
});

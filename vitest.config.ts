import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "next/server": fileURLToPath(new URL("node_modules/next/server.js", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"]
  }
});

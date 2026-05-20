import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@lottery/contracts": resolve(__dirname, "packages/contracts/src/index.ts"),
      "@lottery/domain": resolve(__dirname, "packages/domain/src/index.ts"),
      "@lottery/adapters": resolve(__dirname, "packages/adapters/src/index.ts"),
      "@lottery/contracts/": `${resolve(__dirname, "packages/contracts/src")}/`,
      "@lottery/domain/": `${resolve(__dirname, "packages/domain/src")}/`,
      "@lottery/adapters/": `${resolve(__dirname, "packages/adapters/src")}/`,
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/test/**/*.test.ts", "services/api/test/**/*.test.ts"],
  },
});

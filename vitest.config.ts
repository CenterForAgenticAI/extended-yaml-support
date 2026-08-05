import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/decoration-plan.ts",
        "src/languages.ts",
        "src/yaml-blocks.ts",
        "src/xml-regions.ts",
      ],
      reporter: ["text", "json-summary"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
});

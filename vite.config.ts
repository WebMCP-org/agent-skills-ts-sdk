import { defineConfig } from "vite-plus";

const ignoredGeneratedFiles = [
  "API.md",
  "dist/**",
  "node_modules/**",
  "coverage/**",
  "playground/.wrangler/**",
  "playground/dist/**",
  "playground/node_modules/**",
  "playground/worker-configuration.d.ts",
];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    target: "esnext",
    platform: "node",
    fixedExtension: false,
    deps: {
      alwaysBundle: ["yaml"],
      onlyBundle: ["yaml"],
    },
    tsconfig: "./tsconfig.json",
  },
  lint: {
    ignorePatterns: ignoredGeneratedFiles,
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ignoredGeneratedFiles,
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/index.ts"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});

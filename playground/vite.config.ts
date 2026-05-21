import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".wrangler/**", "dist/**", "worker-configuration.d.ts"],
  },
  lint: {
    ignorePatterns: [".wrangler/**", "dist/**", "worker-configuration.d.ts"],
  },
  plugins: [react(), cloudflare()],
});

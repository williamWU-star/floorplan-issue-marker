/*
 * Field Notes deployment note: GitHub Pages serves the app below a repository
 * path, so the base is injectable at build time while local preview stays at /.
 */
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), vitePluginManusRuntime()],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
    },
  },
  root: path.resolve(projectRoot, "client"),
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
  },
});

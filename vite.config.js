import { defineConfig } from "vite";

export default defineConfig({
  root: "demo",
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    outDir: "../dist/demo",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    environment: "happy-dom",
    include: ["tests/**/*.test.js"],
  },
});

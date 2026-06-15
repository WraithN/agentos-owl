import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: path.resolve(__dirname, "src/main.ts"),
      formats: ["cjs"],
      fileName: () => "main.cjs",
    },
    outDir: "dist/main",
    emptyOutDir: true,
    rollupOptions: {
      external: ["electron"],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

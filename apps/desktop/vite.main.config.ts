import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
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
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, "src/db/schema.sql"),
          dest: path.resolve(__dirname, "dist/db"),
        },
      ],
    }),
  ],
});

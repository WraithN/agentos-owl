import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";

export default defineConfig({
  ssr: {
    noExternal: ["@earendil-works/pi-agent-core", "@earendil-works/pi-ai"],
  },
  build: {
    ssr: true,
    lib: {
      entry: {
        main: path.resolve(__dirname, "src/main.ts"),
        "runtime/SessionThreadEntry": path.resolve(__dirname, "src/runtime/SessionThreadEntry.ts"),
      },
      formats: ["cjs"],
      fileName: (_format, entryName) => `${entryName}.cjs`,
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
        {
          // Worker 线程构建产物位于 dist/main/runtime/，需要从该目录向上定位 schema.sql
          src: path.resolve(__dirname, "src/db/schema.sql"),
          dest: path.resolve(__dirname, "dist/main/db"),
        },
      ],
    }),
  ],
});

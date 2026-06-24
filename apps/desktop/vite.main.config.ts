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
        "agent-orchestrator/session/thread-worker": path.resolve(__dirname, "src/agent-orchestrator/session/thread-worker.ts"),
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
          // Worker 线程构建产物位于 dist/main/agent-orchestrator/，需要从该目录向上定位 schema.sql
          src: path.resolve(__dirname, "src/db/schema.sql"),
          dest: path.resolve(__dirname, "dist/main/db"),
        },
        {
          // 系统提示词文件，构建后输出到 dist/prompt/，供主进程与 Worker 线程读取
          src: path.resolve(__dirname, "prompt"),
          dest: path.resolve(__dirname, "dist"),
        },
      ],
    }),
  ],
});

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const desktopDir = path.resolve(__dirname, "..");

const DEV_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_PORT}`;

function runWebDev() {
  return spawn("pnpm", ["--filter", "@owl-os/web", "exec", "vite", "--port", String(DEV_PORT)], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

function build(file: string) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("npx", ["vite", "build", "--config", file], {
      cwd: desktopDir,
      stdio: "inherit",
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build ${file} failed with code ${code}`));
    });
  });
}

async function waitForServer(url: string, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`dev server did not start at ${url}`);
}

async function main() {
  const webDev = runWebDev();
  await waitForServer(DEV_SERVER_URL);

  await build("vite.main.config.ts");
  await build("vite.preload.config.ts");

  const electron = spawn(
    "pnpm",
    [
      "exec",
      "electron",
      "--disable-gpu",
      "--disable-gpu-sandbox",
      "--disable-software-rasterizer",
      "--no-sandbox",
      "--no-zygote",
      path.join(desktopDir, "dist/main/main.cjs"),
    ],
    {
      cwd: desktopDir,
      stdio: "inherit",
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: DEV_SERVER_URL,
      },
    }
  );

  electron.on("close", (code) => {
    webDev.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

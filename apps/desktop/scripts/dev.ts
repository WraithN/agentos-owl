import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const desktopDir = path.resolve(__dirname, "..");

const DEV_PORT = 5173;
const DEV_HOST = "127.0.0.1";
const DEV_SERVER_URL = `http://${DEV_HOST}:${DEV_PORT}`;

function runWebDev() {
  return spawn(
    "pnpm",
    ["--filter", "@owl-os/web", "exec", "vite", "--host", DEV_HOST, "--port", String(DEV_PORT), "--strictPort"],
    {
      cwd: rootDir,
      stdio: "inherit",
    }
  );
}

async function checkServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
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

async function waitForServer(url: string, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkServer(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`dev server did not start at ${url}`);
}

async function main() {
  const alreadyRunning = await checkServer(DEV_SERVER_URL);
  let webDev: ReturnType<typeof spawn> | null = null;
  if (alreadyRunning) {
    console.log(`[dev] reuse existing web dev server at ${DEV_SERVER_URL}`);
  } else {
    console.log(`[dev] starting web dev server at ${DEV_SERVER_URL}`);
    webDev = runWebDev();
  }
  await waitForServer(DEV_SERVER_URL);

  await build("vite.main.config.ts");
  await build("vite.preload.config.ts");

  const { ELECTRON_RUN_AS_NODE: _, ...baseEnv } = process.env;
  const electronArgs = ["exec", "electron"];
  if (process.env.ELECTRON_ENABLE_LOGGING === "1") {
    electronArgs.push("--enable-logging");
  }
  electronArgs.push(path.join(desktopDir, "dist/main/main.cjs"));

  const electron = spawn(
    "pnpm",
    electronArgs,
    {
      cwd: desktopDir,
      stdio: "inherit",
      env: {
        ...baseEnv,
        VITE_DEV_SERVER_URL: DEV_SERVER_URL,
      },
    }
  );

  electron.on("close", (code) => {
    webDev?.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

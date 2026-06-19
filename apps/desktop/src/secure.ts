import { safeStorage, app } from "electron";
import fs from "node:fs";
import path from "node:path";

const SERVICE = "com.owl.os";

function secretsDir(): string {
  const dir = path.join(app.getPath("userData"), "secrets");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function secretFile(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_/.\-]/g, "_");
  const file = path.join(secretsDir(), `${safe}.enc`);
  // 确保父目录存在（key 可以包含子路径，如 llm_model_key/xxx）
  const parent = path.dirname(file);
  fs.mkdirSync(parent, { recursive: true });
  return file;
}

function isAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function encrypt(value: string): string {
  if (isAvailable()) {
    return safeStorage.encryptString(value).toString("base64");
  }
  // 降级：开发环境 base64（不安全，仅测试）
  return Buffer.from(value).toString("base64");
}

export function decrypt(encrypted: string): string {
  const buffer = Buffer.from(encrypted, "base64");
  if (isAvailable()) {
    return safeStorage.decryptString(buffer);
  }
  return buffer.toString("utf-8");
}

export function setSecret(key: string, value: string): void {
  fs.writeFileSync(secretFile(key), encrypt(value));
}

export function getSecret(key: string): string | undefined {
  const file = secretFile(key);
  if (!fs.existsSync(file)) return undefined;
  return decrypt(fs.readFileSync(file, "utf-8"));
}

export function deleteSecret(key: string): void {
  const file = secretFile(key);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

export function apiKeySecretId(keyId: string): string {
  return `api_key/${keyId}`;
}

export function webhookSecretId(webhookId: string): string {
  return `webhook/${webhookId}`;
}

export { SERVICE };

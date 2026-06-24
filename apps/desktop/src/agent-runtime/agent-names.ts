import type { AgentNameGenerator } from "@owl-os/core";
import agentNameData from "./data/agent-names.json" with { type: "json" };

const usedNamesBySession = new Map<string, Set<string>>();
const sessionAgentNames = new Map<string, Map<string, string>>();
const persistCallbacks = new Map<string, (names: Record<string, string>) => void>();

function randomInt(max: number): number {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

function pick<T>(array: T[]): T {
  return array[randomInt(array.length)];
}

function pickDistinct<T>(array: T[], count: number): T[] {
  const result: T[] = [];
  const copy = [...array];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const index = randomInt(copy.length);
    result.push(copy[index]);
    copy.splice(index, 1);
  }
  return result;
}

type CharLocaleConfig = { type: "chars"; values: string[]; length: { min: number; max: number } };
type NameLocaleConfig = { type: "names"; values: string[] };
type LocaleConfig = CharLocaleConfig | NameLocaleConfig;

function isCharLocale(config: LocaleConfig): config is CharLocaleConfig {
  return config.type === "chars";
}

function generateNameForLocale(locale: string): string {
  const lang = locale.split("-")[0].toLowerCase();
  const config = (agentNameData.locales as Record<string, LocaleConfig>)[lang] ?? agentNameData.locales.en;
  if (isCharLocale(config)) {
    const { min, max } = config.length;
    const length = min + randomInt(max - min + 1);
    return pickDistinct(config.values, length).join("");
  }
  return pick(config.values);
}

function randomFallbackName(): string {
  const { alphabet, length } = agentNameData.fallback;
  const count = length.min + randomInt(length.max - length.min + 1);
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function randomAgentName(sessionId: string, locale: string): string {
  let used = usedNamesBySession.get(sessionId);
  if (!used) {
    used = new Set();
    usedNamesBySession.set(sessionId, used);
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    const name = generateNameForLocale(locale);
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  // 兜底：生成随机字母串并避免冲突
  for (let attempt = 0; attempt < 100; attempt++) {
    const name = randomFallbackName();
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  return `a${randomInt(10)}`;
}

function makeAgentKey(role: string, title: string): string {
  return `${role}:${title}`;
}

/**
 * 为指定会话预置已持久化的 Agent 名字。
 * 主线程在启动 Worker 前、Worker 在初始化时均应调用，
 * 确保同一会话内各运行时使用同一套名字。
 */
export function setSessionAgentNames(
  sessionId: string,
  names: Record<string, string>,
  onPersist?: (names: Record<string, string>) => void,
): void {
  const map = new Map(Object.entries(names));
  sessionAgentNames.set(sessionId, map);
  const used = new Set(Object.values(names));
  usedNamesBySession.set(sessionId, used);
  if (onPersist) {
    persistCallbacks.set(sessionId, onPersist);
  }
}

export function setAgentNamesPersistCallback(
  sessionId: string,
  onPersist: (names: Record<string, string>) => void,
): void {
  persistCallbacks.set(sessionId, onPersist);
}

export function clearSessionAgentNames(sessionId: string): void {
  usedNamesBySession.delete(sessionId);
  sessionAgentNames.delete(sessionId);
  persistCallbacks.delete(sessionId);
}

function getSessionAgentName(sessionId: string, role: string, title: string): string | undefined {
  return sessionAgentNames.get(sessionId)?.get(makeAgentKey(role, title));
}

function recordSessionAgentName(sessionId: string, role: string, title: string, name: string): void {
  let map = sessionAgentNames.get(sessionId);
  if (!map) {
    map = new Map();
    sessionAgentNames.set(sessionId, map);
  }
  const key = makeAgentKey(role, title);
  if (map.get(key) === name) return;
  map.set(key, name);

  let used = usedNamesBySession.get(sessionId);
  if (!used) {
    used = new Set();
    usedNamesBySession.set(sessionId, used);
  }
  used.add(name);

  const callback = persistCallbacks.get(sessionId);
  if (!callback) return;
  const record = Object.fromEntries(map.entries());
  // 异步回调，避免阻塞同步的名字生成器
  queueMicrotask(() => callback(record));
}

export function generateBossName(sessionId: string, locale = "zh-CN"): string {
  const existing = getSessionAgentName(sessionId, "elder", "boss");
  if (existing) return existing;
  const name = randomAgentName(sessionId, locale);
  recordSessionAgentName(sessionId, "elder", "boss", name);
  return name;
}

export const localeAwareNameGenerator: AgentNameGenerator = ({ role, sessionId, locale, title }) => {
  const existing = getSessionAgentName(sessionId, role, title);
  if (existing) return existing;
  const name = randomAgentName(sessionId, locale);
  recordSessionAgentName(sessionId, role, title, name);
  return name;
};

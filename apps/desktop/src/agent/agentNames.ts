import type { AgentNameGenerator } from "@owl-os/core";

const usedNamesBySession = new Map<string, Set<string>>();
const bossNames = new Map<string, string>();

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

// 中文：常见取名用字，组合成 2~3 字人名
const CHINESE_CHARS = [
  "伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "洋", "勇",
  "军", "杰", "娟", "涛", "明", "超", "华", "鹏", "飞", "婷",
  "宇", "浩", "欣", "雨", "晨", "轩", "昊", "瑞", "嘉", "悦",
  "彤", "梓", "涵", "诗", "琪", "妍", "茜", "琳", "雯", "萱",
  "怡", "然", "熙", "辰", "睿", "航", "琦", "璐", "馨", "蕾",
  "泽", "博", "思", "佳", "子", "文", "志", "国", "建", "云",
];

function generateChineseName(): string {
  const length = 2 + randomInt(2); // 2 或 3
  return pickDistinct(CHINESE_CHARS, length).join("");
}

// 英文：2~3 个字母的短人名
const ENGLISH_NAMES = [
  "Amy", "Ann", "Ace", "Ava", "Bea", "Ben", "Bud", "Cai", "Cam", "Cat",
  "Dan", "Deb", "Dee", "Eli", "Eve", "Fay", "Fin", "Fox", "Gus", "Guy",
  "Hal", "Han", "Ike", "Ivy", "Jax", "Jay", "Jed", "Jet", "Jim", "Joe",
  "Joy", "Kai", "Kay", "Ken", "Kim", "Kit", "Koa", "Lea", "Leo", "Les",
  "Lex", "Lia", "Liv", "Liz", "Lou", "Lux", "Lyn", "Mae", "Max", "Meg",
  "Mel", "Mia", "Min", "Nan", "Nat", "Ned", "Neo", "Nia", "Noa", "Ola",
  "Ora", "Pam", "Pat", "Pax", "Peg", "Pia", "Rae", "Rex", "Rio", "Rob",
  "Rod", "Ron", "Roy", "Roz", "Rue", "Rui", "Sal", "Sam", "Sol", "Sue",
  "Tad", "Taj", "Ted", "Tex", "Tia", "Tim", "Tod", "Tom", "Uma", "Val",
  "Van", "Vic", "Viv", "Wes", "Wim", "Yan", "Yul", "Zac", "Zoe", "Zoe",
];

function generateEnglishName(): string {
  return pick(ENGLISH_NAMES);
}

// 日文：常见 2~3 字人名（汉字/平假名）
const JAPANESE_NAMES = [
  "太郎", "花子", "健太", "美咲", "裕子", "浩二", "直樹", "さくら", "ゆき", "あきら",
  "けん", "りん", "そら", "はる", "かな", "たくみ", "まゆ", "れい", "しょう", "あおい",
  "りく", "ひな", "ゆうた", "まさし", "えみ", "たいき", "あすか", "かいと", "ゆい", "りょう",
  "けいこ", "たける", "ななみ", "じろう", "さちこ", "ひろし", "あゆみ", "けんじ", "まり", "たつや",
];

// 韩文：常见 2 字人名（Hangul）
const KOREAN_NAMES = [
  "민수", "지훈", "서연", "민재", "지우", "현우", "준서", "도윤", "시우", "주원",
  "하은", "지민", "수아", "서아", "예은", "채원", "민서", "준영", "예진", "도현",
  "서준", "아린", "재민", "수빈", "윤서", "태양", "가온", "나은", "다온", "라희",
  "마루", "바다", "사랑", "하늘", "지환", "수민", "정우", "소연", "민규", "유진",
];

function generateNameForLocale(locale: string): string {
  const lang = locale.split("-")[0].toLowerCase();
  switch (lang) {
    case "zh":
      return generateChineseName();
    case "ja":
      return pick(JAPANESE_NAMES);
    case "ko":
      return pick(KOREAN_NAMES);
    case "en":
    default:
      return generateEnglishName();
  }
}

function randomFallbackName(): string {
  const length = 2 + randomInt(2);
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(length);
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

export function generateBossName(sessionId: string, locale = "zh-CN"): string {
  const cached = bossNames.get(sessionId);
  if (cached) return cached;
  const name = randomAgentName(sessionId, locale);
  bossNames.set(sessionId, name);
  return name;
}

export const localeAwareNameGenerator: AgentNameGenerator = ({ role, sessionId, locale }) => {
  if (role === "elder") return generateBossName(sessionId, locale);
  return randomAgentName(sessionId, locale);
};

export function now(): number {
  return Date.now();
}

export function daysAgo(days: number): number {
  return now() - days * 24 * 60 * 60 * 1000;
}

export async function argonHash(password: string): Promise<string> {
  const { hash } = await import("argon2");
  return hash(password);
}

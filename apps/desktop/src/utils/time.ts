export function nowMs(): number {
  return Date.now();
}

export function now(): number {
  return nowMs();
}

export function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

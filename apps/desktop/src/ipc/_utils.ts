export function nowMs(): number {
  return Date.now();
}

export function uuid(): string {
  return crypto.randomUUID();
}

import argon2 from "argon2";

export async function hash(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verify(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

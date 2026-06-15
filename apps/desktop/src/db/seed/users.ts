import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { User } from "../types.js";
import { argonHash, now } from "./utils.js";

export async function seedDefaultUser(db: Database.Database): Promise<void> {
  const count = db.prepare("SELECT COUNT(*) FROM users").pluck().get() as number;
  if (count > 0) return;

  const passwordHash = await argonHash("admin");
  const user: User = {
    id: "usr-default",
    username: "admin",
    passwordHash,
    displayName: "管理员",
    createdAt: now(),
    updatedAt: now(),
  };
  queries.createUser(db, user);
}

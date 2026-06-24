import { ipcMain } from "electron";
import { getDatabase } from "../../db/connection.js";
import * as queries from "../../db/queries/index.js";
import * as crypto from "../../utils/crypto/password.js";
import type { User } from "../../db/types.js";
import { nowMs } from "../../utils/time.js";
import { uuid } from "../../utils/id.js";

export function registerAuthHandlers(): void {
  ipcMain.handle("sign_in", async (_event, username: string, password: string) => {
    const user = queries.getUserByUsername(getDatabase(), username);
    if (!user) {
      throw new Error("用户名或密码错误");
    }
    if (!(await crypto.verify(password, user.passwordHash))) {
      throw new Error("用户名或密码错误");
    }
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
    };
  });

  ipcMain.handle("sign_up", async (_event, username: string, password: string) => {
    const db = getDatabase();
    const existing = queries.getUserByUsername(db, username);
    if (existing) {
      throw new Error("用户名已存在");
    }
    const user: User = {
      id: uuid(),
      username,
      passwordHash: await crypto.hash(password),
      displayName: username,
      avatar: undefined,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    };
    queries.createUser(db, user);
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
    };
  });

  ipcMain.handle("get_profile", (_event, id: string) => {
    const user = queries.getUserById(getDatabase(), id);
    if (!user) {
      throw new Error("用户不存在");
    }
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
    };
  });
}

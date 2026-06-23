import { beforeEach, describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

vi.mock("../../db/connection.js", () => ({
  getDatabase: vi.fn(() => ({})),
}));

vi.mock("../../db/queries/index.js", () => ({
  getSetting: vi.fn(),
}));

import * as queries from "../../db/queries/index.js";
import {
  ensureWorkspaceDir,
  getDefaultWorkspaceDir,
  getWorkspaceDir,
  resolveWorkspacePath,
} from "../../agent/workspacePath.js";

const TEST_WS = "/tmp/owl-test-workspace";

describe("workspacePath", () => {
  beforeEach(() => {
    vi.mocked(queries.getSetting).mockReset();
  });

  it("default workspace dir contains ~/.config/owl-os/workspace", () => {
    expect(getDefaultWorkspaceDir()).toBe(
      path.join(os.homedir(), ".config", "owl-os", "workspace")
    );
  });

  it("getWorkspaceDir falls back to default when setting is undefined", () => {
    vi.mocked(queries.getSetting).mockReturnValue(undefined);
    expect(getWorkspaceDir()).toBe(getDefaultWorkspaceDir());
  });

  it("relative path resolves under workspace", () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    expect(resolveWorkspacePath("foo/bar.txt")).toBe(
      path.join(TEST_WS, "foo", "bar.txt")
    );
  });

  it("resolves workspace root from dot input", () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    expect(resolveWorkspacePath(".")).toBe(TEST_WS);
  });

  it("resolves workspace root from empty string input", () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    expect(resolveWorkspacePath("")).toBe(TEST_WS);
  });

  it("strips trailing slashes while resolving", () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    expect(resolveWorkspacePath("foo/bar/")).toBe(
      path.join(TEST_WS, "foo", "bar")
    );
  });

  it("allows relative traversal that stays inside workspace", () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    expect(resolveWorkspacePath("foo/../bar.txt")).toBe(
      path.join(TEST_WS, "bar.txt")
    );
  });

  it("../etc/passwd throws path traversal error", () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    expect(() => resolveWorkspacePath("../etc/passwd")).toThrow(
      "路径越界：禁止访问 workspace 之外的目录"
    );
  });

  it("/tmp/foo.docx throws absolute path outside workspace error", () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    expect(() => resolveWorkspacePath("/tmp/foo.docx")).toThrow(
      "绝对路径必须在 workspace 内：/tmp/foo.docx"
    );
  });

  it("absolute path inside workspace is allowed", () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    const target = path.join(TEST_WS, "inside.docx");
    expect(resolveWorkspacePath(target)).toBe(target);
  });

  it("ensureWorkspaceDir creates the workspace directory recursively", async () => {
    vi.mocked(queries.getSetting).mockReturnValue(TEST_WS);
    const mkdirSpy = vi
      .spyOn(fs, "mkdir")
      .mockResolvedValue(undefined as unknown as string);

    await ensureWorkspaceDir();

    expect(mkdirSpy).toHaveBeenCalledWith(TEST_WS, { recursive: true });
    mkdirSpy.mockRestore();
  });
});

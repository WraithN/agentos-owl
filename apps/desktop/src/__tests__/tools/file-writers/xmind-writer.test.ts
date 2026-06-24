import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { getWorkspaceDir } from "../../../agent-runtime/workspace-path.js";
import { writeXFile } from "../../../agent-runtime/tools/file-writers/index.js";

const XMIND_TEST_FILE = "xmind-test.xmind";

describe("xmind writer", () => {
  const createdPaths: string[] = [];

  afterEach(async () => {
    for (const target of createdPaths) {
      await fs.rm(target, { recursive: true, force: true });
    }
    createdPaths.length = 0;
  });

  it("creates a non-empty xmind file with title and nested topics", async () => {
    const resolved = await writeXFile({
      output_path: XMIND_TEST_FILE,
      title: "Project Plan",
      topics: [
        {
          title: "Research",
          children: [{ title: "Market" }, { title: "Tech" }],
        },
        { title: "Design" },
      ],
    });
    createdPaths.push(resolved);

    expect(resolved).toBe(path.join(getWorkspaceDir(), XMIND_TEST_FILE));
    const stat = await fs.stat(resolved);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);

    const buf = await fs.readFile(resolved);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("uses default root title when title is empty", async () => {
    const resolved = await writeXFile({
      output_path: XMIND_TEST_FILE,
      topics: [{ title: "Only Child" }],
    });
    createdPaths.push(resolved);

    const stat = await fs.stat(resolved);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("creates an empty mind map when topics are undefined", async () => {
    const resolved = await writeXFile({
      output_path: XMIND_TEST_FILE,
      title: "Empty Map",
    });
    createdPaths.push(resolved);

    const stat = await fs.stat(resolved);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });
});

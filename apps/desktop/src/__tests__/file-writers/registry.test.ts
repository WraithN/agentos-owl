import { describe, expect, it } from "vitest";
import { writeXFile } from "../../agent/file-writers/index.js";

describe("writeXFile registry", () => {
  it("throws for unsupported extension when no fallback", async () => {
    await expect(
      writeXFile({ output_path: "foo.unknown", content: "hi" })
    ).rejects.toThrow("不支持的文件类型");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import * as XLSX from "xlsx";
import { writeXFile } from "../../agent/file-writers/index.js";
import { resolveWorkspacePath } from "../../agent/workspacePath.js";

const XLSX_TEST_FILE = "xlsx-test.xlsx";
const CSV_TEST_FILE = "csv-test.csv";

async function cleanupTestFiles(): Promise<void> {
	await fs.rm(resolveWorkspacePath(XLSX_TEST_FILE), { force: true });
	await fs.rm(resolveWorkspacePath(CSV_TEST_FILE), { force: true });
}

describe("xlsx writer", () => {
	afterEach(async () => {
		await cleanupTestFiles();
	});

	it("creates xlsx with sheets", async () => {
		const resolved = await writeXFile({
			output_path: XLSX_TEST_FILE,
			title: "Sales",
			sheets: [
				{
					name: "Q1",
					rows: [
						["Product", "Revenue"],
						["A", "100"],
					],
				},
			],
		});

		const buf = await fs.readFile(resolved);
		const workbook = XLSX.read(buf, { type: "buffer" });
		expect(workbook.SheetNames).toContain("Q1");
		const sheet = workbook.Sheets["Q1"];
		expect(sheet["A1"].v).toBe("Product");
		expect(sheet["B2"].v).toBe("100");
	});

	it("creates csv from first sheet", async () => {
		const resolved = await writeXFile({
			output_path: CSV_TEST_FILE,
			sheets: [
				{
					name: "Sheet1",
					rows: [
						["a", "b"],
						["1", "2"],
					],
				},
			],
		});

		const text = await fs.readFile(resolved, "utf-8");
		expect(text).toContain("a,b");
		expect(text).toContain("1,2");
	});
});

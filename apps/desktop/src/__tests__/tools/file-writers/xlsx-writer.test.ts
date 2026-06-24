import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import * as XLSX from "xlsx";
import { writeXFile } from "../../../agent-runtime/tools/file-writers/index.js";
import { resolveWorkspacePath } from "../../../agent-runtime/workspace-path.js";

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
		expect(workbook.Props?.Title).toBe("Sales");
		const sheet = workbook.Sheets["Q1"];
		expect(sheet["A1"].v).toBe("Product");
		expect(sheet["B2"].v).toBe("100");
	});

	it("creates empty xlsx when sheets are undefined", async () => {
		const resolved = await writeXFile({
			output_path: XLSX_TEST_FILE,
		});

		const buf = await fs.readFile(resolved);
		const workbook = XLSX.read(buf, { type: "buffer" });
		expect(workbook.SheetNames).toEqual(["Sheet1"]);
	});

	it("uses title as default sheet name for empty xlsx", async () => {
		const resolved = await writeXFile({
			output_path: XLSX_TEST_FILE,
			title: "Empty Report",
		});

		const buf = await fs.readFile(resolved);
		const workbook = XLSX.read(buf, { type: "buffer" });
		expect(workbook.SheetNames).toEqual(["Empty Report"]);
		expect(workbook.Props?.Title).toBe("Empty Report");
	});

	it("uses title as sheet name when sheet name is empty", async () => {
		const resolved = await writeXFile({
			output_path: XLSX_TEST_FILE,
			title: "Report",
			sheets: [
				{
					name: "",
					rows: [
						["A", "B"],
						["1", "2"],
					],
				},
			],
		});

		const buf = await fs.readFile(resolved);
		const workbook = XLSX.read(buf, { type: "buffer" });
		expect(workbook.SheetNames).toContain("Report");
		const sheet = workbook.Sheets["Report"];
		expect(sheet["A1"].v).toBe("A");
		expect(sheet["B2"].v).toBe("2");
	});

	it("creates xlsx with multiple sheets", async () => {
		const resolved = await writeXFile({
			output_path: XLSX_TEST_FILE,
			sheets: [
				{
					name: "Q1",
					rows: [["Q1"]],
				},
				{
					name: "Q2",
					rows: [["Q2"]],
				},
			],
		});

		const buf = await fs.readFile(resolved);
		const workbook = XLSX.read(buf, { type: "buffer" });
		expect(workbook.SheetNames).toEqual(["Q1", "Q2"]);
		expect(workbook.Sheets["Q1"]["A1"].v).toBe("Q1");
		expect(workbook.Sheets["Q2"]["A1"].v).toBe("Q2");
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

	it("creates empty csv when sheets are undefined", async () => {
		const resolved = await writeXFile({
			output_path: CSV_TEST_FILE,
		});

		const text = await fs.readFile(resolved, "utf-8");
		expect(text).toBe("");
	});

	it("csv only uses the first sheet when multiple sheets are supplied", async () => {
		const resolved = await writeXFile({
			output_path: CSV_TEST_FILE,
			sheets: [
				{
					name: "First",
					rows: [
						["first", "sheet"],
						["1", "2"],
					],
				},
				{
					name: "Second",
					rows: [
						["second", "sheet"],
						["3", "4"],
					],
				},
			],
		});

		const text = await fs.readFile(resolved, "utf-8");
		expect(text).toContain("first,sheet");
		expect(text).toContain("1,2");
		expect(text).not.toContain("second,sheet");
		expect(text).not.toContain("3,4");
	});
});

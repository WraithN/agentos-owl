import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { FileWriter, WriteXFileParams } from "./types.js";

async function writeXlsx(
	params: WriteXFileParams,
	resolvedPath: string,
): Promise<void> {
	await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
	const ext = path.extname(resolvedPath).toLowerCase();

	if (ext === ".csv") {
		const sheet = params.sheets?.[0];
		if (!sheet) {
			await fs.writeFile(resolvedPath, "", "utf-8");
			return;
		}
		const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
		const csv = XLSX.utils.sheet_to_csv(worksheet);
		await fs.writeFile(resolvedPath, csv, "utf-8");
		return;
	}

	const workbook = XLSX.utils.book_new();
	for (const sheet of params.sheets ?? []) {
		const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
		XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
	}
	XLSX.writeFile(workbook, resolvedPath);
}

export const xlsxWriter: FileWriter = {
	extensions: [".xlsx", ".csv"],
	write: writeXlsx,
};

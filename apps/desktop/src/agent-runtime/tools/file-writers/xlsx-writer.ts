import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { FileWriter, Sheet, WriteXFileParams } from "./types.js";

const CSV_EXTENSION = ".csv";
const DEFAULT_SHEET_NAME = "Sheet1";
const WRITE_ENCODING = "utf-8";
const XLSX_BOOK_TYPE = "xlsx";

/**
 * 为工作表生成一个可用名称。
 * - 若工作表本身提供了非空且未重复的名称，则直接使用。
 * - 若工作表没有名称且调用方提供了 title，则使用 title 作为名称。
 * - 其余情况使用 Sheet{index+1} 作为默认名，并避免与已用名称冲突。
 */
function resolveSheetName(
	sheet: Sheet,
	title: string | undefined,
	index: number,
	usedNames: Set<string>,
): string {
	const trimmedName = sheet.name?.trim();
	if (trimmedName && !usedNames.has(trimmedName)) {
		return trimmedName;
	}

	const fallback = trimmedName
		? `${DEFAULT_SHEET_NAME}${index + 1}`
		: (title?.trim() ?? `${DEFAULT_SHEET_NAME}${index + 1}`);

	if (!usedNames.has(fallback)) {
		return fallback;
	}

	return `${DEFAULT_SHEET_NAME}${index + 1}`;
}

async function writeXlsx(
	params: WriteXFileParams,
	resolvedPath: string,
): Promise<void> {
	await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
	const ext = path.extname(resolvedPath).toLowerCase();
	const title = params.title?.trim();

	if (ext === CSV_EXTENSION) {
		const sheet = params.sheets?.[0];
		if (!sheet) {
			await fs.writeFile(resolvedPath, "", WRITE_ENCODING);
			return;
		}
		const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
		const csv = XLSX.utils.sheet_to_csv(worksheet);
		await fs.writeFile(resolvedPath, csv, WRITE_ENCODING);
		return;
	}

	const workbook = XLSX.utils.book_new();
	if (title) {
		workbook.Props = { Title: title };
	}

	const sheets = params.sheets ?? [];
	if (sheets.length === 0) {
		const defaultName = title ?? DEFAULT_SHEET_NAME;
		const worksheet = XLSX.utils.aoa_to_sheet([]);
		XLSX.utils.book_append_sheet(workbook, worksheet, defaultName);
	} else {
		const usedNames = new Set<string>();
		for (let i = 0; i < sheets.length; i++) {
			const sheet = sheets[i];
			const name = resolveSheetName(sheet, title, i, usedNames);
			usedNames.add(name);
			const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
			XLSX.utils.book_append_sheet(workbook, worksheet, name);
		}
	}

	const buffer = XLSX.write(workbook, {
		type: "buffer",
		bookType: XLSX_BOOK_TYPE,
	});
	await fs.writeFile(resolvedPath, buffer);
}

export const xlsxWriter: FileWriter = {
	extensions: [".xlsx", ".csv"],
	write: writeXlsx,
};

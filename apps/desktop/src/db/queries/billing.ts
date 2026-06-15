import type Database from "better-sqlite3";
import type { BillingRecord } from "../types.js";

export function listBilling(db: Database.Database): BillingRecord[] {
  const rows = db
    .prepare(
      "SELECT id, record_date, tokens, cost, model, created_at FROM billing_records ORDER BY record_date"
    )
    .all() as Record<string, unknown>[];
  return rows.map(mapBillingRecord);
}

export function insertBilling(
  db: Database.Database,
  record: BillingRecord
): void {
  db.prepare(
    "INSERT INTO billing_records (id, record_date, tokens, cost, model, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    record.id,
    record.recordDate,
    record.tokens,
    record.cost,
    record.model,
    record.createdAt
  );
}

function mapBillingRecord(row: Record<string, unknown>): BillingRecord {
  return {
    id: String(row.id),
    recordDate: String(row.record_date),
    tokens: Number(row.tokens),
    cost: Number(row.cost),
    model: String(row.model),
    createdAt: Number(row.created_at),
  };
}

import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { BillingRecord } from "../types.js";
import { daysAgo } from "../../utils/time.js";

export function seedBilling(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) FROM billing_records").pluck().get() as number;
  if (count > 0) return;

  const records: BillingRecord[] = [
    { id: "b-1", recordDate: "06-06", tokens: 18240, cost: 1.28, model: "GPT-4o", createdAt: daysAgo(9) },
    { id: "b-2", recordDate: "06-07", tokens: 24560, cost: 1.92, model: "GPT-4o", createdAt: daysAgo(8) },
    { id: "b-3", recordDate: "06-08", tokens: 12380, cost: 0.87, model: "Claude 3.5", createdAt: daysAgo(7) },
    { id: "b-4", recordDate: "06-09", tokens: 31200, cost: 2.45, model: "GPT-4o", createdAt: daysAgo(6) },
    { id: "b-5", recordDate: "06-10", tokens: 28900, cost: 2.13, model: "GPT-4o", createdAt: daysAgo(5) },
    { id: "b-6", recordDate: "06-11", tokens: 19650, cost: 1.47, model: "Claude 3.5", createdAt: daysAgo(4) },
    { id: "b-7", recordDate: "06-12", tokens: 16800, cost: 1.4, model: "GPT-4o", createdAt: daysAgo(3) },
  ];

  for (const record of records) {
    queries.insertBilling(db, record);
  }
}

import { z } from "zod";
import { isoDate } from "./common";

// GET /api/reports/daily?date=YYYY-MM-DD&days=8
export const dailyReportQuerySchema = z
  .object({
    date: isoDate.optional(),
    days: z.coerce.number().int().min(1).max(31).default(8),
  })
  .strict();

export type DailyReportQuery = z.infer<typeof dailyReportQuerySchema>;

// GET /api/reports/export?date=&days=&jenis=hari|rentang
export const reportExportQuerySchema = z
  .object({
    date: isoDate.optional(),
    days: z.coerce.number().int().min(1).max(31).default(8),
    jenis: z.enum(["hari", "rentang"]).default("hari"),
  })
  .strict();

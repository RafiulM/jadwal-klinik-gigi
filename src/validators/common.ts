import { z } from "zod";

export const uuid = z.string().uuid();

/** Tanggal kalender `YYYY-MM-DD` (zona waktu klinik). */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Gunakan format tanggal YYYY-MM-DD.")
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
    "Tanggal tidak valid.",
  );

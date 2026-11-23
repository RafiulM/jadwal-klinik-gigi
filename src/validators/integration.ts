import { z } from "zod";
import { isoDate, uuid } from "./common";

// API integrasi n8n (/api/integrations/n8n/*).

export const integrationIdSchema = uuid;

// POST /outbox/claim { limit? }
export const claimOutboxSchema = z
  .object({ limit: z.number().int().min(1).max(50).default(20) })
  .strict();

// POST /outbox/:id/ack
//   result "sent"  → selesai
//   result "retry" → kembali antre setelah retryAfterSeconds (default 15 menit)
//   result "failed"→ berhenti, simpan galat
export const ackOutboxSchema = z
  .object({
    result: z.enum(["sent", "retry", "failed"]),
    error: z.string().trim().max(500).optional(),
    retryAfterSeconds: z.number().int().min(30).max(86_400).optional(),
  })
  .strict();

// GET ?date=YYYY-MM-DD (opsional; default ditentukan endpoint).
export const integrationDateQuerySchema = z
  .object({ date: isoDate.optional() })
  .strict();

export type AckOutboxInput = z.infer<typeof ackOutboxSchema>;

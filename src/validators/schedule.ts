import { z } from "zod";
import { isoDate, uuid } from "./common";

// GET /api/schedule?from=YYYY-MM-DD&days=7&doctorId=<uuid>
export const scheduleQuerySchema = z
  .object({
    from: isoDate.optional(),
    days: z.coerce.number().int().min(1).max(31).default(7),
    doctorId: uuid.optional(),
  })
  .strict();

export type ScheduleQuery = z.infer<typeof scheduleQuerySchema>;

export const scheduleAppointmentIdSchema = uuid;

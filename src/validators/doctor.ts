import { z } from "zod";
import { isoDate } from "./common";

// GET /api/doctor/today — tanggal opsional, default hari ini (zona klinik).
export const doctorDayQuerySchema = z
  .object({ date: isoDate.optional() })
  .strict();

export type DoctorDayQuery = z.infer<typeof doctorDayQuerySchema>;

// Klien browser untuk API papan jadwal (khusus admin klinik).
//   GET /api/schedule?from=YYYY-MM-DD&days=7 → ScheduleWeek
//   GET /api/schedule/appointments/:id      → ScheduleAppointmentDetail
import { apiRequest } from "@/lib/api-client";
import type { ScheduleAppointmentDetail, ScheduleWeek } from "./types";

export type {
  ScheduleAppointment,
  ScheduleAppointmentDetail,
  ScheduleDoctor,
  ScheduleWeek,
} from "./types";

export const scheduleApi = {
  week: (from: string) =>
    apiRequest<ScheduleWeek>(
      `/api/schedule?from=${encodeURIComponent(from)}&days=7`,
    ),
  appointment: (id: string) =>
    apiRequest<ScheduleAppointmentDetail>(
      `/api/schedule/appointments/${encodeURIComponent(id)}`,
    ),
};

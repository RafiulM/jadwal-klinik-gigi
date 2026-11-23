// Klien browser untuk API papan jadwal (khusus admin klinik).
//   GET /api/schedule?from=YYYY-MM-DD&days=7 → ScheduleWeek
//   GET /api/schedule/appointments/:id      → ScheduleAppointment
import { apiRequest } from "@/lib/api-client";
import {
  getMockWeek,
  type ScheduleAppointment,
  type ScheduleWeek,
} from "./mock-data";

export type {
  ScheduleAppointment,
  ScheduleDoctor,
  ScheduleWeek,
} from "./mock-data";

const http = {
  week: (from: string) =>
    apiRequest<ScheduleWeek>(
      `/api/schedule?from=${encodeURIComponent(from)}&days=7`,
    ),
  appointment: (id: string) =>
    apiRequest<ScheduleAppointment>(
      `/api/schedule/appointments/${encodeURIComponent(id)}`,
    ),
};

// Selama endpoint backend fase 3 belum ada, klien memakai data tiruan dengan
// bentuk yang sama. Ganti ke `http` saat GET /api/schedule tersedia.
const mock: typeof http = {
  week: async (from) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return getMockWeek(from);
  },
  appointment: async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const found = getMockWeek("2026-11-23").appointments.find(
      (a) => a.id === id,
    );
    if (!found) throw new Error("Janji temu tidak ditemukan.");
    return found;
  },
};

const USE_MOCK = true;

export const scheduleApi = USE_MOCK ? mock : http;

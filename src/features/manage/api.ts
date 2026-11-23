// Klien browser untuk API Kelola klinik (khusus admin, izin clinic:manage).
//   GET   /api/admin/services        POST /api/admin/services
//   PATCH /api/admin/services/:id    (nama, keterangan, durasi, kontrol, isActive)
//   GET   /api/admin/doctors         POST /api/admin/doctors
//   PATCH /api/admin/doctors/:id     (data dokter, layanan, akun, isActive)
//   GET   /api/admin/doctors/:id/schedule
//   PUT   /api/admin/doctors/:id/schedule  { slotIntervalMinutes, days }
import { apiRequest, apiSend } from "@/lib/api-client";
import type { AdminDoctor, AdminService, DoctorWeekSchedule } from "./types";

export type {
  AdminDoctor,
  AdminService,
  DoctorWeekSchedule,
  ScheduleDay,
} from "./types";

export type ServicePatch = Partial<Omit<AdminService, "id">>;
export type DoctorPatch = Partial<Omit<AdminDoctor, "id">>;

export const manageApi = {
  services: () => apiRequest<AdminService[]>("/api/admin/services"),
  createService: (input: Omit<AdminService, "id" | "isActive">) =>
    apiSend<AdminService>("/api/admin/services", "POST", input),
  updateService: (id: string, patch: ServicePatch) =>
    apiSend<AdminService>(
      `/api/admin/services/${encodeURIComponent(id)}`,
      "PATCH",
      patch,
    ),
  doctors: () => apiRequest<AdminDoctor[]>("/api/admin/doctors"),
  createDoctor: (input: Omit<AdminDoctor, "id" | "isActive">) =>
    apiSend<AdminDoctor>("/api/admin/doctors", "POST", input),
  updateDoctor: (id: string, patch: DoctorPatch) =>
    apiSend<AdminDoctor>(
      `/api/admin/doctors/${encodeURIComponent(id)}`,
      "PATCH",
      patch,
    ),
  schedule: (doctorId: string) =>
    apiRequest<DoctorWeekSchedule>(
      `/api/admin/doctors/${encodeURIComponent(doctorId)}/schedule`,
    ),
  saveSchedule: (doctorId: string, schedule: DoctorWeekSchedule) =>
    apiSend<DoctorWeekSchedule>(
      `/api/admin/doctors/${encodeURIComponent(doctorId)}/schedule`,
      "PUT",
      {
        slotIntervalMinutes: schedule.slotIntervalMinutes,
        days: schedule.days,
      },
    ),
};

// Klien browser untuk API Kelola klinik (khusus admin).
//   GET   /api/admin/services        POST /api/admin/services
//   PATCH /api/admin/services/:id    (nama, keterangan, durasi, kontrol, isActive)
//   GET   /api/admin/doctors         POST /api/admin/doctors
//   PATCH /api/admin/doctors/:id     (data dokter, layanan, akun, isActive)
//   GET   /api/admin/doctors/:id/schedule
//   PUT   /api/admin/doctors/:id/schedule  { slotIntervalMinutes, days }
import { apiRequest, apiSend } from "@/lib/api-client";
import {
  MOCK_DOCTORS,
  MOCK_SCHEDULES,
  MOCK_SERVICES,
  type AdminDoctor,
  type AdminService,
  type DoctorWeekSchedule,
} from "./mock-data";

export type {
  AdminDoctor,
  AdminService,
  DoctorWeekSchedule,
  ScheduleDay,
} from "./mock-data";

export type ServicePatch = Partial<Omit<AdminService, "id">>;
export type DoctorPatch = Partial<Omit<AdminDoctor, "id">>;

const http = {
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

// Adaptor data tiruan (disimpan di memori tab) sampai endpoint admin fase 3
// tersedia. Bentuk data dan galatnya sama dengan API.
const store = {
  services: structuredClone(MOCK_SERVICES),
  doctors: structuredClone(MOCK_DOCTORS),
  schedules: structuredClone(MOCK_SCHEDULES),
};
const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const mock: typeof http = {
  services: async () => {
    await wait(200);
    return structuredClone(store.services);
  },
  createService: async (input) => {
    await wait();
    const service = { ...input, id: crypto.randomUUID(), isActive: true };
    store.services.push(service);
    return structuredClone(service);
  },
  updateService: async (id, patch) => {
    await wait();
    const index = store.services.findIndex((s) => s.id === id);
    if (index < 0) throw new Error("Layanan tidak ditemukan.");
    store.services[index] = { ...store.services[index], ...patch };
    return structuredClone(store.services[index]);
  },
  doctors: async () => {
    await wait(200);
    return structuredClone(store.doctors);
  },
  createDoctor: async (input) => {
    await wait();
    const doctor = { ...input, id: crypto.randomUUID(), isActive: true };
    store.doctors.push(doctor);
    // Dokter baru belum punya jam praktik: semua hari libur.
    store.schedules[doctor.id] = {
      doctorId: doctor.id,
      slotIntervalMinutes: 30,
      days: [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
        dayOfWeek,
        open: false,
        start: "09:00",
        end: "15:00",
      })),
    };
    return structuredClone(doctor);
  },
  updateDoctor: async (id, patch) => {
    await wait();
    const index = store.doctors.findIndex((d) => d.id === id);
    if (index < 0) throw new Error("Dokter tidak ditemukan.");
    store.doctors[index] = { ...store.doctors[index], ...patch };
    return structuredClone(store.doctors[index]);
  },
  schedule: async (doctorId) => {
    await wait(200);
    const schedule = store.schedules[doctorId];
    if (!schedule) throw new Error("Dokter tidak ditemukan.");
    return structuredClone(schedule);
  },
  saveSchedule: async (doctorId, schedule) => {
    await wait();
    store.schedules[doctorId] = structuredClone(schedule);
    return structuredClone(schedule);
  },
};

const USE_MOCK = true;

export const manageApi = USE_MOCK ? mock : http;

// Klien browser untuk API jadwal dokter (src/routes/api/doctor).
import { apiRequest, apiSend } from "@/lib/api-client";
import type { AppointmentStatus } from "@/components/status-badge";
import type { FollowUpStatus } from "@/features/followup/api";

export type TodayAppointment = {
  id: string;
  code: string;
  time: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string;
  /** Tanggal kontrol berikutnya yang ditetapkan dokter; "" bila tidak ada. */
  followUpDate: string;
  followUpStatus: FollowUpStatus | null;
  service: {
    id: string;
    name: string;
    followUpDays: number | null;
    suggestedFollowUpDate: string | null;
  };
  patient: { id: string; name: string; phone: string; firstVisit: boolean };
};

export type DoctorDay = {
  date: string;
  doctor: {
    id: string;
    name: string;
    hours: { start: string; end: string } | null;
  };
  appointments: TodayAppointment[];
};

export type AppointmentUpdate = {
  status?: AppointmentStatus;
  notes?: string;
  followUpDate?: string | null;
};

export const doctorApi = {
  today: () => apiRequest<DoctorDay>("/api/doctor/today"),
  update: (id: string, input: AppointmentUpdate) =>
    apiSend<TodayAppointment>(
      `/api/doctor/appointments/${encodeURIComponent(id)}`,
      "PATCH",
      input,
    ),
};

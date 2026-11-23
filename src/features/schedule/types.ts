// Bentuk data API papan jadwal (src/routes/api/schedule).
import type { AppointmentStatus } from "@/components/status-badge";

export type ScheduleDoctor = {
  id: string;
  name: string;
  /** Hari praktik, 0 = Minggu … 6 = Sabtu. */
  practiceDays: number[];
};

export type ScheduleAppointment = {
  id: string;
  code: string;
  date: string;
  time: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string;
  /** Tanggal kontrol berikutnya yang ditetapkan dari kunjungan ini; "" bila tidak ada. */
  followUpDate: string;
  /** Waktu pasien membuat booking (ISO). */
  createdAt: string;
  service: { id: string; name: string };
  doctor: { id: string; name: string };
  patient: { id: string; name: string; phone: string };
};

/** Detail dari GET /api/schedule/appointments/:id. */
export type ScheduleAppointmentDetail = ScheduleAppointment & {
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  followUpStatus: "pending" | "booked" | "done" | null;
  previousVisits: number;
};

export type ScheduleWeek = {
  today: string;
  from: string;
  days: { date: string; dayOfWeek: number }[];
  doctors: ScheduleDoctor[];
  services: { id: string; name: string }[];
  appointments: ScheduleAppointment[];
};

// Klien browser untuk API kontrol pasien (src/routes/api/follow-ups,
// src/routes/api/patients/$id/history). Khusus staf klinik.
import { apiRequest } from "@/lib/api-client";
import type { AppointmentStatus } from "@/components/status-badge";

export type FollowUpStatus = "pending" | "booked" | "done";

export type FollowUp = {
  id: string;
  dueDate: string;
  status: FollowUpStatus;
  notes: string;
  /** Kunjungan yang menetapkan tanggal kontrol ini (null bila dihapus). */
  sourceVisitId: string | null;
  sourceVisitDate: string | null;
  bookedAppointmentId: string | null;
  service: { id: string; name: string };
  doctor: { id: string; name: string };
  patient: { id: string; name: string; phone: string };
};

export type HistoryVisit = {
  id: string;
  date: string;
  time: string;
  service: string;
  doctor: string;
  status: AppointmentStatus;
  notes: string;
  followUpDate: string | null;
};

export type PatientHistoryData = {
  patient: { id: string; name: string; phone: string };
  visits: HistoryVisit[];
  followUps: FollowUp[];
};

export const followUpApi = {
  list: () =>
    apiRequest<{ today: string; followUps: FollowUp[] }>("/api/follow-ups"),
  history: (patientId: string) =>
    apiRequest<PatientHistoryData>(
      `/api/patients/${encodeURIComponent(patientId)}/history`,
    ),
};

/** Kontrol berikutnya yang belum dijalani (jatuh tempo paling awal). */
export function upcomingFollowUp(followUps: FollowUp[]) {
  return (
    [...followUps]
      .filter((f) => f.status !== "done")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null
  );
}

import {
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  type LucideIcon,
} from "lucide-react";

// Peran staf klinik dan halaman awal masing-masing setelah masuk.
export type StaffRole = "dokter" | "admin" | "pemilik";

export const ROLE_INFO: Record<
  StaffRole,
  { label: string; home: string; icon: LucideIcon; summary: string }
> = {
  dokter: {
    label: "Dokter",
    home: "/dokter",
    icon: CalendarCheck,
    summary: "Jadwal pasien hari ini, catatan, dan kontrol berikutnya.",
  },
  admin: {
    label: "Admin",
    home: "/jadwal",
    icon: CalendarDays,
    summary: "Papan jadwal klinik, layanan, dokter, dan jam praktik.",
  },
  pemilik: {
    label: "Pemilik",
    home: "/rekap",
    icon: ChartColumn,
    summary: "Rekap kunjungan harian dan unduh laporan.",
  },
};

// Bentuk data API Kelola klinik (src/routes/api/admin).

export type AdminService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  /** Saran kontrol rutin (hari); null bila tidak ada. */
  followUpDays: number | null;
  isActive: boolean;
};

export type AdminDoctor = {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  isActive: boolean;
  serviceIds: string[];
  /** Email akun login yang ditautkan ke dokter ini; null bila belum ada. */
  accountEmail: string | null;
};

export type ScheduleDay = {
  /** 0 = Minggu … 6 = Sabtu. */
  dayOfWeek: number;
  open: boolean;
  start: string;
  end: string;
};

export type DoctorWeekSchedule = {
  doctorId: string;
  slotIntervalMinutes: number;
  days: ScheduleDay[];
  /** Hanya setelah simpan: janji mendatang yang kini di luar jam praktik. */
  outsideHours?: number;
};

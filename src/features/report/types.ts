// Bentuk data rekap harian pemilik.
//   GET /api/reports/daily?date=YYYY-MM-DD&days=8 → DailyReport

export type DoctorDayRecap = {
  id: string;
  name: string;
  total: number;
  completed: number;
  noShow: number;
  /** Janji yang belum ditandai (masih menunggu). */
  waiting: number;
};

export type DayRecap = {
  date: string;
  dayOfWeek: number;
  /** Dokter yang punya janji pada hari itu. */
  doctors: DoctorDayRecap[];
  /** Jumlah dokter aktif yang punya jam praktik di hari itu (0 = klinik tutup). */
  practicingDoctors: number;
  total: number;
  completed: number;
  noShow: number;
  waiting: number;
};

export type DailyReport = {
  today: string;
  /** Tanggal yang dipilih (hari terakhir pada `days`). */
  date: string;
  /** Rentang hari berurutan, terlama dulu, berakhir di `date`. */
  days: DayRecap[];
  /** Semua dokter aktif, untuk menyebut siapa yang tidak praktik. */
  doctors: { id: string; name: string }[];
  /** Agregasi per dokter untuk seluruh rentang `days`. */
  period: PeriodDoctor[];
};

export type PeriodDoctor = {
  id: string;
  name: string;
  /** Hari yang punya janji temu untuk dokter ini. */
  days: number;
  /** Pasien unik (pasien yang datang dua kali dihitung sekali). */
  patients: number;
  total: number;
  completed: number;
  noShow: number;
};

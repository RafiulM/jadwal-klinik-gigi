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
  /** Dokter yang punya janji pada hari itu; kosong = klinik tutup/sepi. */
  doctors: DoctorDayRecap[];
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
};

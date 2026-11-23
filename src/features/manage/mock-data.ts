// Data tiruan Kelola klinik selama layer frontend fase 3 dikerjakan.
// Kontrak API yang akan dibuat di layer backend (khusus admin):
//   GET   /api/admin/services             → AdminService[]
//   GET   /api/admin/doctors              → AdminDoctor[]
//   GET   /api/admin/doctors/:id/schedule → DoctorWeekSchedule

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
};

export const MOCK_SERVICES: AdminService[] = [
  {
    id: "scaling",
    name: "Scaling",
    description: "Membersihkan karang gigi dan plak.",
    durationMinutes: 45,
    followUpDays: 180,
    isActive: true,
  },
  {
    id: "behel",
    name: "Kontrol behel",
    description: "Cek dan pengencangan kawat behel.",
    durationMinutes: 30,
    followUpDays: 30,
    isActive: true,
  },
  {
    id: "tambal",
    name: "Tambal gigi",
    description: "Menambal gigi berlubang atau retak.",
    durationMinutes: 45,
    followUpDays: null,
    isActive: true,
  },
  {
    id: "periksa",
    name: "Periksa & konsultasi",
    description: "Cek kondisi gigi dan bahas keluhan.",
    durationMinutes: 30,
    followUpDays: null,
    isActive: true,
  },
];

export const MOCK_DOCTORS: AdminDoctor[] = [
  {
    id: "rina",
    name: "drg. Rina Pratiwi",
    specialization: "Dokter gigi umum",
    phone: "081200002001",
    isActive: true,
    serviceIds: ["scaling", "tambal", "periksa"],
  },
  {
    id: "bagus",
    name: "drg. Bagus Setiawan, Sp.Ort",
    specialization: "Spesialis ortodonti (behel)",
    phone: "081200002002",
    isActive: true,
    serviceIds: ["behel", "periksa"],
  },
  {
    id: "maya",
    name: "drg. Maya Lestari",
    specialization: "Dokter gigi umum",
    phone: "081200002003",
    isActive: true,
    serviceIds: ["scaling", "tambal", "periksa"],
  },
];

function weekly(
  doctorId: string,
  openDays: number[],
  start: string,
  end: string,
): DoctorWeekSchedule {
  return {
    doctorId,
    slotIntervalMinutes: 30,
    days: [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
      dayOfWeek,
      open: openDays.includes(dayOfWeek),
      start,
      end,
    })),
  };
}

export const MOCK_SCHEDULES: Record<string, DoctorWeekSchedule> = {
  rina: weekly("rina", [1, 3, 5], "09:00", "14:00"),
  bagus: weekly("bagus", [2, 4, 6], "13:00", "18:00"),
  maya: weekly("maya", [1, 2, 4, 6], "16:00", "20:00"),
};

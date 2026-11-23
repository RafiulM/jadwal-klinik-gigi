// Data tiruan jadwal hari ini selama layer frontend fase 2 dikerjakan.
// Bentuknya mengikuti kontrak API yang akan dibuat di layer backend:
//   GET /api/doctor/today → { date, doctor, appointments: TodayAppointment[] }

export type AppointmentStatus = "scheduled" | "completed" | "no_show";

export type TodayAppointment = {
  id: string;
  time: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string;
  /** Tanggal kontrol berikutnya yang ditetapkan dokter; kosong bila tidak ada. */
  followUpDate: string;
  service: { id: string; name: string; followUpDays: number | null };
  patient: { id: string; name: string; phone: string; firstVisit: boolean };
};

export const TODAY = {
  date: "2026-11-23",
  doctor: { name: "drg. Rina Pratiwi", hours: "09.00–14.00" },
};

export const TODAY_APPOINTMENTS: TodayAppointment[] = [
  {
    id: "a1",
    time: "09:00",
    endTime: "09:30",
    status: "completed",
    notes:
      "Karang gigi rahang bawah cukup tebal. Gusi sedikit berdarah saat dibersihkan.",
    followUpDate: "2027-05-22",
    service: { id: "scaling", name: "Scaling", followUpDays: 180 },
    patient: {
      id: "p1",
      name: "Sari Wulandari",
      phone: "0813••••4471",
      firstVisit: false,
    },
  },
  {
    id: "a2",
    time: "10:00",
    endTime: "10:30",
    status: "no_show",
    notes: "",
    followUpDate: "",
    service: { id: "tambal", name: "Tambal gigi", followUpDays: null },
    patient: {
      id: "p2",
      name: "Andi Pratama",
      phone: "0812••••3092",
      firstVisit: false,
    },
  },
  {
    id: "a3",
    time: "10:30",
    endTime: "11:00",
    status: "scheduled",
    notes: "",
    followUpDate: "",
    service: {
      id: "periksa",
      name: "Periksa & konsultasi",
      followUpDays: null,
    },
    patient: {
      id: "p3",
      name: "Dewi Anggraini",
      phone: "0857••••6635",
      firstVisit: true,
    },
  },
  {
    id: "a4",
    time: "11:00",
    endTime: "11:30",
    status: "scheduled",
    notes: "",
    followUpDate: "",
    service: { id: "scaling", name: "Scaling", followUpDays: 180 },
    patient: {
      id: "p4",
      name: "Rudi Hartono",
      phone: "0811••••2286",
      firstVisit: false,
    },
  },
  {
    id: "a5",
    time: "12:00",
    endTime: "12:30",
    status: "scheduled",
    notes: "",
    followUpDate: "",
    service: { id: "tambal", name: "Tambal gigi", followUpDays: null },
    patient: {
      id: "p5",
      name: "Lina Marlina",
      phone: "0878••••0937",
      firstVisit: false,
    },
  },
  {
    id: "a6",
    time: "13:00",
    endTime: "13:30",
    status: "scheduled",
    notes: "",
    followUpDate: "",
    service: { id: "scaling", name: "Scaling", followUpDays: 180 },
    patient: {
      id: "p6",
      name: "Fajar Nugroho",
      phone: "0819••••1150",
      firstVisit: true,
    },
  },
];

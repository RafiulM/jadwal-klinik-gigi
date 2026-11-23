// Data tiruan kontrol pasien selama layer frontend fase 2 dikerjakan.
// Kontrak API yang akan dibuat di layer backend:
//   GET /api/follow-ups?status=&range=&q=  → FollowUp[]
//   GET /api/patients/:id/history          → PatientHistory

export type FollowUpStatus = "pending" | "booked" | "done";

export type FollowUp = {
  id: string;
  dueDate: string;
  status: FollowUpStatus;
  notes: string;
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
  status: "scheduled" | "completed" | "no_show";
  notes: string;
  followUpDate: string | null;
};

export const TODAY = "2026-11-23";

export const FOLLOW_UPS: FollowUp[] = [
  {
    id: "f1",
    dueDate: "2026-11-20",
    status: "pending",
    notes: "",
    service: { id: "scaling", name: "Scaling" },
    doctor: { id: "rina", name: "drg. Rina Pratiwi" },
    patient: { id: "p7", name: "Hendra Gunawan", phone: "0812••••3318" },
  },
  {
    id: "f2",
    dueDate: "2026-11-25",
    status: "pending",
    notes: "Kontrol kawat bawah yang longgar.",
    service: { id: "behel", name: "Kontrol behel" },
    doctor: { id: "bagus", name: "drg. Bagus Setiawan, Sp.Ort" },
    patient: { id: "p8", name: "Putri Maharani", phone: "0857••••2290" },
  },
  {
    id: "f3",
    dueDate: "2026-11-28",
    status: "booked",
    notes: "",
    service: { id: "behel", name: "Kontrol behel" },
    doctor: { id: "bagus", name: "drg. Bagus Setiawan, Sp.Ort" },
    patient: { id: "p9", name: "Dimas Prasetyo", phone: "0813••••7741" },
  },
  {
    id: "f4",
    dueDate: "2026-12-12",
    status: "pending",
    notes: "",
    service: { id: "tambal", name: "Tambal gigi" },
    doctor: { id: "maya", name: "drg. Maya Lestari" },
    patient: { id: "p2", name: "Andi Pratama", phone: "0812••••3092" },
  },
  {
    id: "f5",
    dueDate: "2027-05-22",
    status: "pending",
    notes: "",
    service: { id: "scaling", name: "Scaling" },
    doctor: { id: "rina", name: "drg. Rina Pratiwi" },
    patient: { id: "p1", name: "Sari Wulandari", phone: "0813••••4471" },
  },
  {
    id: "f6",
    dueDate: "2026-11-20",
    status: "done",
    notes: "",
    service: { id: "scaling", name: "Scaling" },
    doctor: { id: "rina", name: "drg. Rina Pratiwi" },
    patient: { id: "p4", name: "Rudi Hartono", phone: "0811••••2286" },
  },
];

export const HISTORY: Record<string, HistoryVisit[]> = {
  p1: [
    {
      id: "h1",
      date: "2026-11-23",
      time: "09:00",
      service: "Scaling",
      doctor: "drg. Rina Pratiwi",
      status: "completed",
      notes: "Karang gigi rahang bawah cukup tebal.",
      followUpDate: "2027-05-22",
    },
    {
      id: "h2",
      date: "2026-05-12",
      time: "10:00",
      service: "Scaling",
      doctor: "drg. Rina Pratiwi",
      status: "completed",
      notes: "",
      followUpDate: "2026-11-12",
    },
  ],
  p2: [
    {
      id: "h3",
      date: "2026-11-23",
      time: "10:00",
      service: "Tambal gigi",
      doctor: "drg. Rina Pratiwi",
      status: "no_show",
      notes: "",
      followUpDate: null,
    },
    {
      id: "h4",
      date: "2026-11-02",
      time: "17:00",
      service: "Periksa & konsultasi",
      doctor: "drg. Maya Lestari",
      status: "completed",
      notes: "Geraham kiri bawah berlubang, perlu ditambal.",
      followUpDate: "2026-12-12",
    },
  ],
  p4: [
    {
      id: "h5",
      date: "2026-05-20",
      time: "11:00",
      service: "Scaling",
      doctor: "drg. Rina Pratiwi",
      status: "completed",
      notes: "",
      followUpDate: "2026-11-20",
    },
  ],
  p7: [
    {
      id: "h6",
      date: "2026-05-20",
      time: "09:30",
      service: "Scaling",
      doctor: "drg. Rina Pratiwi",
      status: "completed",
      notes: "",
      followUpDate: "2026-11-20",
    },
  ],
  p8: [
    {
      id: "h7",
      date: "2026-10-25",
      time: "14:00",
      service: "Kontrol behel",
      doctor: "drg. Bagus Setiawan, Sp.Ort",
      status: "completed",
      notes: "",
      followUpDate: "2026-11-25",
    },
  ],
  p9: [
    {
      id: "h8",
      date: "2026-10-28",
      time: "15:00",
      service: "Kontrol behel",
      doctor: "drg. Bagus Setiawan, Sp.Ort",
      status: "completed",
      notes: "",
      followUpDate: "2026-11-28",
    },
  ],
};

// Data tiruan papan jadwal selama layer frontend fase 3 dikerjakan.
// Kontrak API yang akan dibuat di layer backend:
//   GET /api/schedule?from=YYYY-MM-DD&days=7 → ScheduleWeek
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
  service: { id: string; name: string };
  doctor: { id: string; name: string };
  patient: { id: string; name: string; phone: string };
};

export type ScheduleWeek = {
  today: string;
  from: string;
  days: { date: string; dayOfWeek: number }[];
  doctors: ScheduleDoctor[];
  services: { id: string; name: string }[];
  appointments: ScheduleAppointment[];
};

const SERVICES = [
  { id: "scaling", name: "Scaling" },
  { id: "behel", name: "Kontrol behel" },
  { id: "tambal", name: "Tambal gigi" },
  { id: "periksa", name: "Periksa & konsultasi" },
];

const DOCTORS: (ScheduleDoctor & { services: string[] })[] = [
  {
    id: "rina",
    name: "drg. Rina Pratiwi",
    practiceDays: [1, 3, 5],
    services: ["scaling", "tambal", "periksa"],
  },
  {
    id: "bagus",
    name: "drg. Bagus Setiawan, Sp.Ort",
    practiceDays: [2, 4, 6],
    services: ["behel", "behel", "periksa"],
  },
  {
    id: "maya",
    name: "drg. Maya Lestari",
    practiceDays: [1, 2, 4, 6],
    services: ["scaling", "tambal", "periksa"],
  },
];

const BOOKED: Record<string, string[]> = {
  "rina|2026-11-23": ["09:00", "10:00", "10:30", "11:00", "12:00", "13:00"],
  "rina|2026-11-25": ["09:00", "10:00", "11:30"],
  "rina|2026-11-27": ["09:30", "10:00", "10:30", "11:00", "13:30"],
  "bagus|2026-11-24": ["13:00", "13:30", "15:00", "16:30"],
  "bagus|2026-11-26": ["14:00", "14:30"],
  "bagus|2026-11-28": ["13:00", "13:30", "14:00", "15:00", "16:00", "17:30"],
  "maya|2026-11-23": ["16:00", "17:30", "18:00"],
  "maya|2026-11-24": ["16:30", "19:00"],
  "maya|2026-11-26": ["16:00", "16:30", "17:00"],
  "maya|2026-11-28": ["18:30"],
};

const TODAY_RINA: Record<
  string,
  {
    patient: string;
    service: string;
    status: AppointmentStatus;
    notes?: string;
  }
> = {
  "09:00": {
    patient: "Sari Wulandari",
    service: "scaling",
    status: "completed",
    notes: "Karang gigi rahang bawah cukup tebal.",
  },
  "10:00": { patient: "Andi Pratama", service: "tambal", status: "no_show" },
  "10:30": {
    patient: "Dewi Anggraini",
    service: "periksa",
    status: "scheduled",
  },
  "11:00": { patient: "Rudi Hartono", service: "scaling", status: "scheduled" },
  "12:00": { patient: "Lina Marlina", service: "tambal", status: "scheduled" },
  "13:00": {
    patient: "Fajar Nugroho",
    service: "scaling",
    status: "scheduled",
  },
};

const NAMES = [
  "Yuni Kartika",
  "Bayu Saputra",
  "Rani Oktaviani",
  "Hendra Gunawan",
  "Putri Maharani",
  "Dimas Prasetyo",
  "Wulan Sari",
  "Eko Purnomo",
  "Citra Lestari",
  "Fikri Ramadhan",
  "Indah Permata",
  "Joko Susilo",
  "Novi Andriani",
  "Oki Firmansyah",
  "Ratna Dewi",
  "Taufik Hidayat",
];

const TODAY = "2026-11-23";
const DAYS = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 10, 23 + i));
  return { date: date.toISOString().slice(0, 10), dayOfWeek: date.getUTCDay() };
});

function plus30(time: string) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function build(): ScheduleAppointment[] {
  const list: ScheduleAppointment[] = [];
  let name = 0;
  for (const day of DAYS)
    for (const doctor of DOCTORS)
      (BOOKED[`${doctor.id}|${day.date}`] ?? []).forEach((time, i) => {
        const special =
          day.date === TODAY && doctor.id === "rina" ? TODAY_RINA[time] : null;
        const serviceId = special
          ? special.service
          : doctor.services[i % doctor.services.length];
        const patientName = special
          ? special.patient
          : NAMES[name++ % NAMES.length];
        list.push({
          id: `j${list.length + 1}`,
          code: `JK-DEMO${String(list.length + 1).padStart(2, "0")}`,
          date: day.date,
          time,
          endTime: plus30(time),
          status: special?.status ?? "scheduled",
          notes: special?.notes ?? "",
          service: SERVICES.find((s) => s.id === serviceId)!,
          doctor: { id: doctor.id, name: doctor.name },
          patient: {
            id: `p-${patientName}`,
            name: patientName,
            phone: `081200001${String(100 + list.length).padStart(3, "0")}`,
          },
        });
      });
  return list.sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );
}

export const SCHEDULE_WEEK: ScheduleWeek = {
  today: TODAY,
  from: TODAY,
  days: DAYS,
  doctors: DOCTORS.map(({ id, name, practiceDays }) => ({
    id,
    name,
    practiceDays,
  })),
  services: SERVICES,
  appointments: build(),
};

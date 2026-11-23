// Data tiruan untuk halaman booking selama layer frontend dikerjakan.
// Bentuknya mengikuti kontrak API yang akan dibuat di task backend:
//   GET  /api/booking/services
//   GET  /api/booking/doctors?serviceId=
//   GET  /api/booking/availability?doctorId=&from=&days=7
//   POST /api/booking  → 201 { code, ... } atau 409 kalau slot keburu diambil

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  followUpDays: number | null;
};

export type Doctor = {
  id: string;
  name: string;
  initials: string;
  field: string;
  serviceIds: string[];
  /** 0 = Minggu … 6 = Sabtu */
  practiceDays: number[];
  startHour: number;
  endHour: number;
  dayText: string;
  hoursText: string;
};

export type BookingDate = {
  id: string;
  dow: number;
  short: string;
  day: string;
  long: string;
};

export const SERVICES: Service[] = [
  {
    id: "scaling",
    name: "Scaling",
    description: "Membersihkan karang gigi dan plak.",
    durationMinutes: 45,
    followUpDays: 180,
  },
  {
    id: "behel",
    name: "Kontrol behel",
    description: "Cek dan pengencangan kawat behel.",
    durationMinutes: 30,
    followUpDays: 30,
  },
  {
    id: "tambal",
    name: "Tambal gigi",
    description: "Menambal gigi berlubang atau retak.",
    durationMinutes: 45,
    followUpDays: null,
  },
  {
    id: "periksa",
    name: "Periksa & konsultasi",
    description: "Cek kondisi gigi dan bahas keluhan Anda.",
    durationMinutes: 30,
    followUpDays: null,
  },
];

export const DOCTORS: Doctor[] = [
  {
    id: "rina",
    name: "drg. Rina Pratiwi",
    initials: "RP",
    field: "Dokter gigi umum",
    serviceIds: ["scaling", "tambal", "periksa"],
    practiceDays: [1, 3, 5],
    startHour: 9,
    endHour: 14,
    dayText: "Sen, Rab, Jum",
    hoursText: "09.00–14.00",
  },
  {
    id: "bagus",
    name: "drg. Bagus Setiawan, Sp.Ort",
    initials: "BS",
    field: "Spesialis ortodonti (behel)",
    serviceIds: ["behel", "periksa"],
    practiceDays: [2, 4, 6],
    startHour: 13,
    endHour: 18,
    dayText: "Sel, Kam, Sab",
    hoursText: "13.00–18.00",
  },
  {
    id: "maya",
    name: "drg. Maya Lestari",
    initials: "ML",
    field: "Dokter gigi umum",
    serviceIds: ["scaling", "tambal", "periksa"],
    practiceDays: [1, 2, 4, 6],
    startHour: 16,
    endHour: 20,
    dayText: "Sen, Sel, Kam, Sab",
    hoursText: "16.00–20.00",
  },
];

export const DATES: BookingDate[] = [
  { id: "2026-11-23", dow: 1, short: "Sen", day: "23", long: "Senin, 23 November 2026" },
  { id: "2026-11-24", dow: 2, short: "Sel", day: "24", long: "Selasa, 24 November 2026" },
  { id: "2026-11-25", dow: 3, short: "Rab", day: "25", long: "Rabu, 25 November 2026" },
  { id: "2026-11-26", dow: 4, short: "Kam", day: "26", long: "Kamis, 26 November 2026" },
  { id: "2026-11-27", dow: 5, short: "Jum", day: "27", long: "Jumat, 27 November 2026" },
  { id: "2026-11-28", dow: 6, short: "Sab", day: "28", long: "Sabtu, 28 November 2026" },
  { id: "2026-11-29", dow: 0, short: "Min", day: "29", long: "Minggu, 29 November 2026" },
];

/** Slot yang sudah diambil pasien lain, per `dokter|tanggal`. */
export const TAKEN: Record<string, string[]> = {
  "rina|2026-11-23": ["09.00", "10.00", "10.30", "11.00", "12.00", "13.00"],
  "rina|2026-11-25": ["09.00", "10.00", "11.30"],
  "rina|2026-11-27": ["09.30", "10.00", "10.30", "11.00", "13.30"],
  "bagus|2026-11-24": ["13.00", "13.30", "15.00", "16.30"],
  "bagus|2026-11-26": ["14.00", "14.30"],
  "bagus|2026-11-28": ["13.00", "13.30", "14.00", "14.30", "15.00", "15.30", "16.00", "16.30", "17.00", "17.30"],
  "maya|2026-11-23": ["16.00", "17.30", "18.00"],
  "maya|2026-11-24": ["16.30", "19.00"],
  "maya|2026-11-26": ["16.00", "16.30", "17.00"],
  "maya|2026-11-28": ["18.30"],
};

/** Slot yang tampak kosong tapi keburu diambil pasien lain saat konfirmasi. */
export const RACE_SLOT = "rina|2026-11-25|10.30";

export function buildSlots(startHour: number, endHour: number) {
  const slots: string[] = [];
  for (let m = startHour * 60; m < endHour * 60; m += 30) {
    slots.push(
      `${String(Math.floor(m / 60)).padStart(2, "0")}.${String(m % 60).padStart(2, "0")}`,
    );
  }
  return slots;
}

export function takenFor(doctorId: string, dateId: string, lost: string[]) {
  const prefix = `${doctorId}|${dateId}`;
  const extra = lost
    .filter((key) => key.startsWith(`${prefix}|`))
    .map((key) => key.split("|")[2]);
  return [...(TAKEN[prefix] ?? []), ...extra];
}

export function dayInfo(doctor: Doctor, date: BookingDate, lost: string[]) {
  if (!doctor.practiceDays.includes(date.dow))
    return { open: false, label: "Libur" } as const;
  const taken = takenFor(doctor.id, date.id, lost);
  const free = buildSlots(doctor.startHour, doctor.endHour).filter(
    (time) => !taken.includes(time),
  ).length;
  return free === 0
    ? ({ open: false, label: "Penuh" } as const)
    : ({ open: true, label: `${free} kosong` } as const);
}

export function bookingCode(dateId: string, time: string) {
  return `JK-${dateId.slice(8, 10)}${dateId.slice(5, 7)}-${time.replace(".", "")}`;
}

let raceSlotUsed = false;

/** Simulasi POST /api/booking sampai API asli tersedia. */
export function submitBookingMock(input: {
  doctorId: string;
  dateId: string;
  time: string;
}): Promise<{ ok: true; code: string } | { ok: false; reason: "slot_taken" }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const key = `${input.doctorId}|${input.dateId}|${input.time}`;
      if (key === RACE_SLOT && !raceSlotUsed) {
        raceSlotUsed = true;
        resolve({ ok: false, reason: "slot_taken" });
        return;
      }
      resolve({ ok: true, code: bookingCode(input.dateId, input.time) });
    }, 900);
  });
}

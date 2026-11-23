import type { ApiDoctor, DoctorSchedule } from "./api";

export const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_LONG = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function parts(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "2026-11-25" → "Rabu, 25 November 2026" */
export function formatLongDate(isoDate: string) {
  const { y, m, d, dow } = parts(isoDate);
  return `${DAY_LONG[dow]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

/** Judul rentang bulan untuk daftar tanggal, mis. "November–Desember 2026". */
export function monthRangeLabel(dates: string[]) {
  if (dates.length === 0) return "";
  const first = parts(dates[0]);
  const last = parts(dates[dates.length - 1]);
  if (first.y !== last.y)
    return `${MONTHS[first.m - 1]} ${first.y}–${MONTHS[last.m - 1]} ${last.y}`;
  if (first.m !== last.m)
    return `${MONTHS[first.m - 1]}–${MONTHS[last.m - 1]} ${first.y}`;
  return `${MONTHS[first.m - 1]} ${first.y}`;
}

export function dayNumber(isoDate: string) {
  return String(parts(isoDate).d);
}

/** "09:00" → "09.00" (penulisan jam Indonesia). */
export function displayTime(time: string) {
  return time.replace(":", ".");
}

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter((word) => word && !word.endsWith(".") && !word.endsWith(","))
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("") || "?"
  );
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function scheduleDaysText(schedules: DoctorSchedule[]) {
  const days = new Set(schedules.map((s) => s.dayOfWeek));
  return WEEK_ORDER.filter((d) => days.has(d))
    .map((d) => DAY_SHORT[d])
    .join(", ");
}

export function scheduleHoursText(schedules: DoctorSchedule[]) {
  const ranges = [
    ...new Set(
      schedules.map(
        (s) => `${displayTime(s.startTime)}–${displayTime(s.endTime)}`,
      ),
    ),
  ];
  return ranges.length <= 2 ? ranges.join(", ") : "Jam bervariasi";
}

export type DoctorView = {
  id: string;
  name: string;
  initials: string;
  field: string;
  dayText: string;
  hoursText: string;
};

export function toDoctorView(doctor: ApiDoctor): DoctorView {
  return {
    id: doctor.id,
    name: doctor.name,
    initials: initialsOf(doctor.name),
    field: doctor.field,
    dayText: scheduleDaysText(doctor.schedules) || "Jadwal belum diatur",
    hoursText: scheduleHoursText(doctor.schedules),
  };
}

export function followUpText(days: number | null) {
  if (!days) return null;
  if (days % 30 === 0)
    return days === 30 ? "Tiap bulan" : `Tiap ${days / 30} bulan`;
  return `Tiap ${days} hari`;
}

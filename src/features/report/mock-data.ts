// Data tiruan rekap harian selama layer frontend fase 5 dikerjakan.
import type { DailyReport, DayRecap } from "./types";

const DOCTORS = [
  { id: "rina", name: "drg. Rina Pratiwi" },
  { id: "bagus", name: "drg. Bagus Setiawan, Sp.Ort" },
  { id: "maya", name: "drg. Maya Lestari" },
];

const DATA: Record<
  string,
  Record<string, [total: number, completed: number, noShow: number]>
> = {
  "2026-11-16": { rina: [7, 6, 1], maya: [4, 4, 0] },
  "2026-11-17": { bagus: [8, 7, 1], maya: [3, 2, 1] },
  "2026-11-18": { rina: [5, 5, 0] },
  "2026-11-19": { bagus: [6, 6, 0], maya: [5, 4, 1] },
  "2026-11-20": { rina: [8, 7, 1] },
  "2026-11-21": { bagus: [10, 9, 1], maya: [6, 6, 0] },
  "2026-11-22": {},
  "2026-11-23": { rina: [6, 1, 1], maya: [3, 0, 0] },
};

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function recap(date: string): DayRecap {
  const doctors = DOCTORS.filter((d) => DATA[date]?.[d.id]).map((d) => {
    const [total, completed, noShow] = DATA[date][d.id];
    return {
      ...d,
      total,
      completed,
      noShow,
      waiting: total - completed - noShow,
    };
  });
  const sum = (key: "total" | "completed" | "noShow" | "waiting") =>
    doctors.reduce((acc, r) => acc + r[key], 0);
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const practice: Record<string, number[]> = {
    rina: [1, 3, 5],
    bagus: [2, 4, 6],
    maya: [1, 2, 4, 6],
  };
  return {
    date,
    dayOfWeek,
    doctors,
    practicingDoctors: Object.values(practice).filter((days) =>
      days.includes(dayOfWeek),
    ).length,
    total: sum("total"),
    completed: sum("completed"),
    noShow: sum("noShow"),
    waiting: sum("waiting"),
  };
}

export const MOCK_TODAY = "2026-11-23";

export function getMockReport(date: string, days = 8): DailyReport {
  const window = Array.from({ length: days }, (_, i) =>
    recap(addDays(date, i - days + 1)),
  );
  const period = DOCTORS.map((d) => {
    const rows = window.flatMap((day) =>
      day.doctors.filter((r) => r.id === d.id),
    );
    const total = rows.reduce((s, r) => s + r.total, 0);
    return {
      ...d,
      days: rows.length,
      patients: Math.max(0, total - 1),
      total,
      completed: rows.reduce((s, r) => s + r.completed, 0),
      noShow: rows.reduce((s, r) => s + r.noShow, 0),
    };
  })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.completed - a.completed);
  return { today: MOCK_TODAY, date, days: window, doctors: DOCTORS, period };
}

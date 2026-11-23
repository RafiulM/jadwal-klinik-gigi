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
  return {
    date,
    dayOfWeek: new Date(`${date}T00:00:00Z`).getUTCDay(),
    doctors,
    total: sum("total"),
    completed: sum("completed"),
    noShow: sum("noShow"),
    waiting: sum("waiting"),
  };
}

export const MOCK_TODAY = "2026-11-23";

export function getMockReport(date: string, days = 8): DailyReport {
  return {
    today: MOCK_TODAY,
    date,
    days: Array.from({ length: days }, (_, i) =>
      recap(addDays(date, i - days + 1)),
    ),
    doctors: DOCTORS,
  };
}

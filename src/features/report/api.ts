// Klien rekap harian pemilik. Sementara memakai data tiruan sampai endpoint
// GET /api/reports/daily tersedia di layer backend fase 5.
import { getMockReport } from "./mock-data";
import type { DailyReport } from "./types";

export type { DailyReport, DayRecap, DoctorDayRecap } from "./types";

export const reportApi = {
  daily: async (date: string): Promise<DailyReport> => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return getMockReport(date);
  },
};

// Klien rekap harian pemilik (izin reports:read).
//   GET /api/reports/daily?date=YYYY-MM-DD&days=8         → DailyReport
//   GET /api/reports/export?date=&days=&jenis=hari|rentang → berkas CSV
import { ApiFailure, apiRequest } from "@/lib/api-client";
import type { DailyReport } from "./types";

export type {
  DailyReport,
  DayRecap,
  DoctorDayRecap,
  PeriodDoctor,
} from "./types";

const DAYS = 8;

export const reportApi = {
  daily: (date: string) =>
    apiRequest<DailyReport>(
      `/api/reports/daily?date=${encodeURIComponent(date)}&days=${DAYS}`,
    ),

  /** Unduh CSV dari server; mengembalikan isi berkas dan nama berkasnya. */
  async export(date: string, jenis: "hari" | "rentang") {
    const url = `/api/reports/export?date=${encodeURIComponent(date)}&days=${DAYS}&jenis=${jenis}`;
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "text/csv" } });
    } catch {
      throw new ApiFailure(
        0,
        "NETWORK_ERROR",
        "Tidak bisa terhubung ke klinik. Periksa koneksi internet Anda.",
      );
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code: string; message: string };
      } | null;
      throw new ApiFailure(
        response.status,
        body?.error?.code ?? "UNKNOWN",
        body?.error?.message ?? "Rekap belum bisa diunduh. Coba lagi.",
      );
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    const filename =
      /filename="([^"]+)"/.exec(disposition)?.[1] ?? `rekap-klinik-${date}.csv`;
    return { blob: await response.blob(), filename };
  },
};

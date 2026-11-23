import { createFileRoute } from "@tanstack/react-router";
import { withApiPermission } from "@/lib/api.server";
import { getDailyReportAny } from "@/services/report.service.server";
import { dailyReportQuerySchema } from "@/validators/report";

// GET /api/reports/daily?date=YYYY-MM-DD&days=8
// Rekap harian pemilik: `days` hari berakhir di `date` (default hari ini, zona
// klinik; tanggal masa depan dipotong ke hari ini). Per hari: jumlah janji per
// dokter & status dan dokter yang berpraktik; plus agregasi per dokter untuk
// seluruh rentang. Butuh izin reports:read (peran pemilik).
export const Route = createFileRoute("/api/reports/daily")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiPermission(request, { reports: ["read"] }, async () => {
          const query = dailyReportQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json({ data: await getDailyReportAny(query) });
        }),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { withApiPermission } from "@/lib/api.server";
import { getDailyReportAny } from "@/services/report.service.server";
import { dayCsv, periodCsv } from "@/features/report/csv";
import { reportExportQuerySchema } from "@/validators/report";

// GET /api/reports/export?date=YYYY-MM-DD&days=8&jenis=hari|rentang
// Unduh rekap sebagai berkas CSV (UTF-8 + BOM, terbaca Excel):
//   jenis=hari    → rincian per dokter untuk `date` plus baris total
//   jenis=rentang → ringkasan per hari untuk `days` hari berakhir di `date`
// Butuh izin reports:read (peran pemilik).
export const Route = createFileRoute("/api/reports/export")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiPermission(request, { reports: ["read"] }, async () => {
          const query = reportExportQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          const report = await getDailyReportAny(query);
          const last = report.days[report.days.length - 1];
          const [body, filename] =
            query.jenis === "hari"
              ? [dayCsv(last), `rekap-klinik-${report.date}.csv`]
              : [
                  periodCsv(report),
                  `rekap-klinik-${report.days[0].date}_${report.date}.csv`,
                ];
          return new Response(body, {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        }),
    },
  },
});

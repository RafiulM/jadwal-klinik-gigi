import { createFileRoute } from "@tanstack/react-router";
import { withIntegrationKey } from "@/lib/api.server";
import { getDailyRecapAny } from "@/services/integration.service.server";
import { integrationDateQuerySchema } from "@/validators/integration";

// GET /api/integrations/n8n/reports/daily?date=YYYY-MM-DD
// Rekap satu hari (default hari ini) untuk dikirim ke pemilik: angka per
// status & per dokter plus `text` siap kirim dan tautan halaman rekap.
export const Route = createFileRoute("/api/integrations/n8n/reports/daily")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withIntegrationKey(request, async () => {
          const { date } = integrationDateQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json({ data: await getDailyRecapAny(date) });
        }),
    },
  },
});

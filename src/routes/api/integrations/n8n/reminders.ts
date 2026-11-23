import { createFileRoute } from "@tanstack/react-router";
import { withIntegrationKey } from "@/lib/api.server";
import { listAppointmentRemindersAny } from "@/services/integration.service.server";
import { integrationDateQuerySchema } from "@/validators/integration";

// GET /api/integrations/n8n/reminders?date=YYYY-MM-DD
// Janji temu berstatus menunggu pada tanggal itu (default besok, zona klinik)
// untuk pengingat H-1 ke pasien, lengkap dengan nomor HP dan tautan bukti.
export const Route = createFileRoute("/api/integrations/n8n/reminders")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withIntegrationKey(request, async () => {
          const { date } = integrationDateQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json({
            data: await listAppointmentRemindersAny(date),
          });
        }),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { withIntegrationKey } from "@/lib/api.server";
import { listDueFollowUpsAny } from "@/services/integration.service.server";
import { integrationDateQuerySchema } from "@/validators/integration";

// GET /api/integrations/n8n/follow-ups/due?date=YYYY-MM-DD
// Kontrol yang jatuh tempo sampai tanggal itu (default hari ini) dan pasiennya
// belum booking; maksimal 3 pengingat per kontrol, jarak minimal 7 hari.
export const Route = createFileRoute("/api/integrations/n8n/follow-ups/due")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withIntegrationKey(request, async () => {
          const { date } = integrationDateQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json({ data: await listDueFollowUpsAny(date) });
        }),
    },
  },
});

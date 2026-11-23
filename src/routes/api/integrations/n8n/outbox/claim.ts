import { createFileRoute } from "@tanstack/react-router";
import { readJson, withIntegrationKey } from "@/lib/api.server";
import { claimOutboxEventsAny } from "@/services/integration.service.server";
import { claimOutboxSchema } from "@/validators/integration";

// POST /api/integrations/n8n/outbox/claim  { limit?: 1–50 }
// n8n mengambil event yang siap dikirim (appointment_created,
// follow_up_scheduled, follow_up_booked). Event dikunci 10 menit; setiap event
// wajib di-ack lewat /outbox/:id/ack, kalau tidak akan diambil lagi.
export const Route = createFileRoute("/api/integrations/n8n/outbox/claim")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withIntegrationKey(request, async () => {
          // Body boleh kosong (pakai limit bawaan 20).
          const body = request.headers.get("content-type")
            ? await readJson(request)
            : {};
          const { limit } = claimOutboxSchema.parse(body ?? {});
          return Response.json({ data: await claimOutboxEventsAny(limit) });
        }),
    },
  },
});

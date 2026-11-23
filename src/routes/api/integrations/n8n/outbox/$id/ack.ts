import { createFileRoute } from "@tanstack/react-router";
import { readJson, withIntegrationKey } from "@/lib/api.server";
import { integrationResponse } from "@/lib/integration-errors.server";
import { ackOutboxEventAny } from "@/services/integration.service.server";
import { ackOutboxSchema, integrationIdSchema } from "@/validators/integration";

// POST /api/integrations/n8n/outbox/:id/ack
//   { result: "sent" | "retry" | "failed", error?, retryAfterSeconds? }
// Hasil kirim untuk event yang sedang diproses. 409 bila event tidak sedang
// diklaim (mis. sewanya sudah habis dan diambil ulang).
export const Route = createFileRoute("/api/integrations/n8n/outbox/$id/ack")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        withIntegrationKey(request, async () => {
          const id = integrationIdSchema.parse(params.id);
          const input = ackOutboxSchema.parse(await readJson(request));
          return integrationResponse(async () =>
            Response.json({ data: await ackOutboxEventAny(id, input) }),
          );
        }),
    },
  },
});

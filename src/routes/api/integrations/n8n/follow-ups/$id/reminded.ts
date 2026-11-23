import { createFileRoute } from "@tanstack/react-router";
import { withIntegrationKey } from "@/lib/api.server";
import { integrationResponse } from "@/lib/integration-errors.server";
import { markFollowUpRemindedAny } from "@/services/integration.service.server";
import { integrationIdSchema } from "@/validators/integration";

// POST /api/integrations/n8n/follow-ups/:id/reminded
// Catat pengingat kontrol yang sudah dikirim (409 bila pasien sudah booking).
export const Route = createFileRoute(
  "/api/integrations/n8n/follow-ups/$id/reminded",
)({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        withIntegrationKey(request, async () => {
          const id = integrationIdSchema.parse(params.id);
          return integrationResponse(async () =>
            Response.json({ data: await markFollowUpRemindedAny(id) }),
          );
        }),
    },
  },
});

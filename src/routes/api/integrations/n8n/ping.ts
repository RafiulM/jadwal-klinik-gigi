import { createFileRoute } from "@tanstack/react-router";
import { withIntegrationKey } from "@/lib/api.server";
import { clinicNow } from "@/lib/clinic-time";
import { siteConfig } from "@/config/site";

// GET /api/integrations/n8n/ping — cek koneksi & kunci dari n8n.
export const Route = createFileRoute("/api/integrations/n8n/ping")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withIntegrationKey(request, async () =>
          Response.json({
            data: {
              ok: true,
              clinic: siteConfig.name,
              today: clinicNow().date,
              timeZone: "Asia/Jakarta",
            },
          }),
        ),
    },
  },
});

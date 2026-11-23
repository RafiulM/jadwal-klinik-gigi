import { createFileRoute } from "@tanstack/react-router";
import { withPublicApi } from "@/lib/api.server";
import { listActiveServices } from "@/services/booking.service.server";

// GET /api/booking/services — layanan aktif untuk halaman booking pasien.
// followUpDays = interval kontrol rutin (mis. scaling 180, kontrol behel 30);
// null berarti layanan tanpa kontrol rutin.
export const Route = createFileRoute("/api/booking/services")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withPublicApi(request, async () =>
          Response.json({ data: await listActiveServices() }),
        ),
    },
  },
});

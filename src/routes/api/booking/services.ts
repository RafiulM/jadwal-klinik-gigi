import { createFileRoute } from "@tanstack/react-router";
import { withPublicApi } from "@/lib/api.server";
import { listActiveServices } from "@/services/booking.service.server";

// GET /api/booking/services — layanan aktif untuk halaman booking pasien.
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

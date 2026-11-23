import { createFileRoute } from "@tanstack/react-router";
import { withPublicApi } from "@/lib/api.server";
import { listDoctorsForService } from "@/services/booking.service.server";
import { doctorsQuerySchema } from "@/validators/booking";

// GET /api/booking/doctors?serviceId=<uuid> — dokter aktif untuk layanan itu.
export const Route = createFileRoute("/api/booking/doctors")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withPublicApi(request, async () => {
          const { serviceId } = doctorsQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return Response.json({
            data: await listDoctorsForService(serviceId),
          });
        }),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withPublicApi } from "@/lib/api.server";
import { getAvailability } from "@/services/booking.service.server";
import { availabilityQuerySchema } from "@/validators/booking";

// GET /api/booking/availability?doctorId=<uuid>&from=YYYY-MM-DD&days=7
// Tanggal dan slot jam untuk satu dokter: available, taken, atau past.
export const Route = createFileRoute("/api/booking/availability")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withPublicApi(request, async () => {
          const query = availabilityQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          const availability = await getAvailability(query);
          if (!availability)
            throw new ApiError(404, "NOT_FOUND", "Dokter tidak ditemukan.");
          return Response.json({ data: availability });
        }),
    },
  },
});

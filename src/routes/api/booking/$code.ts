import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withPublicApi } from "@/lib/api.server";
import { getBookingByCode } from "@/services/booking.service.server";
import { bookingCodeSchema } from "@/validators/booking";

// GET /api/booking/:code — detail janji temu dari nomor janji (kode booking).
export const Route = createFileRoute("/api/booking/$code")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withPublicApi(request, async () => {
          const parsed = bookingCodeSchema.safeParse(params.code);
          const booking = parsed.success
            ? await getBookingByCode(parsed.data)
            : null;
          // Kode salah format dan kode tidak ada dijawab sama persis.
          if (!booking)
            throw new ApiError(404, "NOT_FOUND", "Janji temu tidak ditemukan.");
          return Response.json({ data: booking });
        }),
    },
  },
});

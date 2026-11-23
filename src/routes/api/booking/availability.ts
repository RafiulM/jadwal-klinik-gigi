import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withPublicApi } from "@/lib/api.server";
import { getAvailability } from "@/services/booking.service.server";
import { availabilityQuerySchema } from "@/validators/booking";

// GET /api/booking/availability?doctorId=<uuid>&serviceId=<uuid>&from=YYYY-MM-DD&days=7
// Endpoint publik (tanpa akun). Tanggal dan slot jam untuk satu dokter aktif:
// available, taken (bentrok dengan janji lain), atau past. Mengikuti jam
// praktik & jarak slot yang diatur admin di Kelola klinik.
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

import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withPublicApi } from "@/lib/api.server";
import { BookingError, createBooking } from "@/services/booking.service.server";
import { createBookingSchema } from "@/validators/booking";

const MESSAGES: Record<BookingError["reason"], [number, string, string]> = {
  service_unavailable: [
    422,
    "SERVICE_UNAVAILABLE",
    "Layanan ini sedang tidak bisa dibooking.",
  ],
  doctor_unavailable: [
    422,
    "DOCTOR_UNAVAILABLE",
    "Dokter ini sedang tidak menerima booking untuk layanan tersebut.",
  ],
  slot_invalid: [422, "SLOT_INVALID", "Jam ini di luar jam praktik dokter."],
  slot_past: [422, "SLOT_PAST", "Jam ini sudah lewat. Pilih jam lain."],
  slot_taken: [
    409,
    "SLOT_TAKEN",
    "Jam ini baru saja diambil pasien lain. Pilih jam lain.",
  ],
};

// POST /api/booking — pasien menyimpan janji temu tanpa akun.
export const Route = createFileRoute("/api/booking/")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withPublicApi(request, async () => {
          const input = createBookingSchema.parse(await readJson(request));
          try {
            const booking = await createBooking(input);
            return Response.json({ data: booking }, { status: 201 });
          } catch (error) {
            if (error instanceof BookingError) {
              const [status, code, message] = MESSAGES[error.reason];
              throw new ApiError(status, code, message);
            }
            throw error;
          }
        }),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiSession } from "@/lib/api.server";
import { clinicNow } from "@/lib/clinic-time";
import {
  findDoctorByUserId,
  getDoctorDay,
} from "@/services/doctor.service.server";
import { doctorDayQuerySchema } from "@/validators/doctor";

// GET /api/doctor/today?date=YYYY-MM-DD
// Janji temu milik dokter yang login pada tanggal itu (default hari ini, zona
// waktu klinik). Dokter ditentukan dari sesi, jadi tidak bisa membaca jadwal
// dokter lain.
export const Route = createFileRoute("/api/doctor/today")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiSession(request, async (session) => {
          const query = doctorDayQuerySchema.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          const doctor = await findDoctorByUserId(session.user.id);
          if (!doctor)
            throw new ApiError(
              403,
              "NOT_A_DOCTOR",
              "Akun ini belum ditautkan ke data dokter.",
            );
          const day = await getDoctorDay(
            doctor,
            query.date ?? clinicNow().date,
          );
          return Response.json({ data: day });
        }),
    },
  },
});

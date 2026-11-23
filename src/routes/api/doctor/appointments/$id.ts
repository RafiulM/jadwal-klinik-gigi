import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import {
  AppointmentUpdateError,
  findDoctorByUserId,
  updateDoctorAppointment,
} from "@/services/doctor.service.server";
import {
  appointmentIdSchema,
  updateAppointmentSchema,
} from "@/validators/doctor";

// PATCH /api/doctor/appointments/:id  { status?, notes? }
// Dokter menandai pasiennya selesai / tidak datang / kembali menunggu dan
// menyimpan catatan. Hanya janji temu milik dokter yang login.
export const Route = createFileRoute("/api/doctor/appointments/$id")({
  server: {
    handlers: {
      PATCH: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = appointmentIdSchema.parse(params.id);
          const input = updateAppointmentSchema.parse(await readJson(request));
          const doctor = await findDoctorByUserId(session.user.id);
          if (!doctor)
            throw new ApiError(
              403,
              "NOT_A_DOCTOR",
              "Akun ini belum ditautkan ke data dokter.",
            );
          try {
            const appointment = await updateDoctorAppointment(
              doctor.id,
              session.user.id,
              id,
              input,
            );
            return Response.json({ data: appointment });
          } catch (error) {
            if (!(error instanceof AppointmentUpdateError)) throw error;
            if (error.reason === "NOT_FOUND")
              throw new ApiError(
                404,
                "NOT_FOUND",
                "Janji temu tidak ditemukan.",
              );
            throw new ApiError(
              409,
              "NOT_STARTED",
              "Janji temu ini belum berlangsung, jadi belum bisa ditandai.",
            );
          }
        }),
    },
  },
});

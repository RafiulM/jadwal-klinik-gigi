import { createFileRoute } from "@tanstack/react-router";
import { ApiError, readJson, withApiSession } from "@/lib/api.server";
import {
  AppointmentUpdateError,
  findDoctorByUserId,
  getDoctorVisitNote,
  updateDoctorAppointment,
} from "@/services/doctor.service.server";
import { appointmentIdSchema, visitNoteSchema } from "@/validators/doctor";

async function requireDoctor(userId: string) {
  const doctor = await findDoctorByUserId(userId);
  if (!doctor)
    throw new ApiError(
      403,
      "NOT_A_DOCTOR",
      "Akun ini belum ditautkan ke data dokter.",
    );
  return doctor;
}

// GET /api/doctor/appointments/:id/note → { appointmentId, notes, editable, updatedAt }
// PUT /api/doctor/appointments/:id/note   { notes }
// Catatan kunjungan dari dokter. Hanya janji temu milik dokter yang login, dan
// catatan baru bisa diisi saat kunjungan sudah tiba (hari ini atau sebelumnya).
export const Route = createFileRoute("/api/doctor/appointments/$id/note")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = appointmentIdSchema.parse(params.id);
          const doctor = await requireDoctor(session.user.id);
          const note = await getDoctorVisitNote(doctor.id, id);
          if (!note)
            throw new ApiError(404, "NOT_FOUND", "Janji temu tidak ditemukan.");
          return Response.json({ data: note });
        }),
      PUT: ({ request, params }) =>
        withApiSession(request, async (session) => {
          const id = appointmentIdSchema.parse(params.id);
          const input = visitNoteSchema.parse(await readJson(request));
          const doctor = await requireDoctor(session.user.id);
          try {
            await updateDoctorAppointment(
              doctor.id,
              session.user.id,
              id,
              input,
            );
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
              "Catatan baru bisa diisi saat kunjungan sudah berlangsung.",
            );
          }
          const note = await getDoctorVisitNote(doctor.id, id);
          return Response.json({ data: note });
        }),
    },
  },
});

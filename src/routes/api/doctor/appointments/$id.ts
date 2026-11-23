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

const UPDATE_ERRORS: Record<
  AppointmentUpdateError["reason"],
  [status: number, message: string]
> = {
  NOT_FOUND: [404, "Janji temu tidak ditemukan."],
  NOT_STARTED: [
    409,
    "Janji temu ini belum berlangsung, jadi belum bisa ditandai.",
  ],
  FOLLOW_UP_NEEDS_COMPLETED: [
    409,
    "Tanggal kontrol hanya bisa diisi untuk kunjungan yang selesai.",
  ],
  FOLLOW_UP_DATE_RANGE: [
    422,
    "Tanggal kontrol harus setelah hari ini dan paling lambat 2 tahun lagi.",
  ],
  FOLLOW_UP_LOCKED: [
    409,
    "Pasien sudah booking kontrol ini, jadi tanggalnya tidak bisa diubah di sini.",
  ],
};

// PATCH /api/doctor/appointments/:id  { status?, notes?, followUpDate? }
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
            const [status, message] = UPDATE_ERRORS[error.reason];
            throw new ApiError(status, error.reason, message);
          }
        }),
    },
  },
});

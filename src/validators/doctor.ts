import { z } from "zod";
import { isoDate, uuid } from "./common";

// GET /api/doctor/today — tanggal opsional, default hari ini (zona klinik).
export const doctorDayQuerySchema = z
  .object({ date: isoDate.optional() })
  .strict();

export type DoctorDayQuery = z.infer<typeof doctorDayQuerySchema>;

export const appointmentIdSchema = uuid;

// PATCH /api/doctor/appointments/:id — tandai hasil kunjungan, catatan, dan
// tanggal kontrol berikutnya.
export const updateAppointmentSchema = z
  .object({
    status: z.enum(["scheduled", "completed", "no_show"]).optional(),
    notes: z
      .string()
      .trim()
      .max(2000, "Catatan maksimal 2000 karakter.")
      .optional(),
    // Tanggal kontrol berikutnya; "" atau null menghapusnya. Hanya untuk
    // kunjungan yang (akan) berstatus selesai.
    // Dokter tidak dipaksa mengisi: boleh dikosongkan bila pasien tidak perlu kontrol.
    followUpDate: z
      .union([
        z.null(),
        z
          .string()
          .trim()
          .pipe(z.union([z.literal(""), isoDate])),
      ])
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.status !== undefined ||
      value.notes !== undefined ||
      value.followUpDate !== undefined,
    { message: "Kirim status, catatan, atau tanggal kontrol." },
  );

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// PUT /api/doctor/appointments/:id/note — string kosong menghapus catatan.
export const visitNoteSchema = z
  .object({
    notes: z.string().trim().max(2000, "Catatan maksimal 2000 karakter."),
  })
  .strict();

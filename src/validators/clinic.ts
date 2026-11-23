import { z } from "zod";
import { uuid } from "./common";

// Kelola klinik (admin): layanan, dokter, jam praktik.

export const clinicIdSchema = uuid;

const serviceFields = {
  name: z
    .string()
    .trim()
    .min(1, "Isi nama layanan.")
    .max(80, "Nama layanan maksimal 80 karakter."),
  description: z.string().trim().max(280, "Keterangan maksimal 280 karakter."),
  durationMinutes: z
    .number()
    .int()
    .min(5, "Durasi minimal 5 menit.")
    .max(240, "Durasi maksimal 240 menit."),
  followUpDays: z
    .number()
    .int()
    .min(1, "Saran kontrol minimal 1 hari.")
    .max(730, "Saran kontrol maksimal 730 hari.")
    .nullable(),
};

export const createServiceSchema = z
  .object({
    ...serviceFields,
    description: serviceFields.description.default(""),
    followUpDays: serviceFields.followUpDays.default(null),
  })
  .strict();

export const updateServiceSchema = z
  .object({ ...serviceFields, isActive: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Kirim minimal satu perubahan.",
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

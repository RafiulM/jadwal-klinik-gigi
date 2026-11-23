import { z } from "zod";
import {
  PHONE_PATTERN,
  canonicalPhone,
  normalizePhone,
} from "@/features/booking/patient-validation";
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

const doctorFields = {
  name: z
    .string()
    .trim()
    .min(1, "Isi nama dokter.")
    .max(120, "Nama dokter maksimal 120 karakter."),
  specialization: z.string().trim().max(120, "Bidang maksimal 120 karakter."),
  // Kosong boleh; bila diisi harus nomor HP Indonesia, disimpan sebagai 08….
  phone: z
    .string()
    .transform(normalizePhone)
    .refine(
      (value) => value === "" || PHONE_PATTERN.test(value),
      "Gunakan nomor HP Indonesia, contoh 0812 3456 7890.",
    )
    .transform((value) => (value ? canonicalPhone(value) : "")),
  // Email akun login dokter (akun dibuat lewat halaman Daftar); null = tanpa akun.
  accountEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Gunakan alamat email yang valid.")
    .max(254)
    .nullable(),
  serviceIds: z
    .array(uuid)
    .min(1, "Pilih minimal satu layanan.")
    .max(50)
    .transform((ids) => [...new Set(ids)]),
};

export const createDoctorSchema = z
  .object({
    ...doctorFields,
    specialization: doctorFields.specialization.default(""),
    phone: doctorFields.phone.default(""),
    accountEmail: doctorFields.accountEmail.default(null),
  })
  .strict();

export const updateDoctorSchema = z
  .object({ ...doctorFields, isActive: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Kirim minimal satu perubahan.",
  });

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Gunakan jam HH:MM.");

// PUT /api/admin/doctors/:id/schedule — jam praktik mingguan, satu blok per hari.
export const doctorScheduleSchema = z
  .object({
    slotIntervalMinutes: z.number().int().min(5).max(240),
    days: z
      .array(
        z
          .object({
            dayOfWeek: z.number().int().min(0).max(6),
            open: z.boolean(),
            start: hhmm,
            end: hhmm,
          })
          .strict()
          .refine((day) => !day.open || day.end > day.start, {
            message: "Jam selesai harus setelah jam mulai.",
            path: ["end"],
          }),
      )
      .length(7, "Kirim ketujuh hari.")
      .refine(
        (days) => new Set(days.map((d) => d.dayOfWeek)).size === 7,
        "Setiap hari hanya boleh muncul sekali.",
      ),
  })
  .strict();

export type DoctorScheduleInput = z.infer<typeof doctorScheduleSchema>;

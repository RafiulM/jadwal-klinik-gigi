import { z } from "zod";
import {
  PHONE_PATTERN,
  canonicalPhone,
  normalizePhone,
} from "@/features/booking/patient-validation";

const uuid = z.string().uuid();

export const doctorsQuerySchema = z.object({ serviceId: uuid }).strict();

export type DoctorsQuery = z.infer<typeof doctorsQuerySchema>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Gunakan format tanggal YYYY-MM-DD.")
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
    "Tanggal tidak valid.",
  );

export const availabilityQuerySchema = z
  .object({
    doctorId: uuid,
    from: isoDate.optional(),
    days: z.coerce.number().int().min(1).max(14).default(7),
  })
  .strict();

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const createBookingSchema = z
  .object({
    serviceId: uuid,
    doctorId: uuid,
    date: isoDate,
    time: z.string().regex(/^\d{2}:\d{2}$/, "Gunakan format jam HH:MM."),
    name: z
      .string()
      .trim()
      .min(2, "Isi nama lengkap Anda.")
      .max(80, "Nama terlalu panjang, maksimal 80 karakter."),
    phone: z
      .string()
      .transform(normalizePhone)
      .refine((value) => PHONE_PATTERN.test(value), {
        message: "Gunakan nomor HP Indonesia, contoh 0812 3456 7890.",
      })
      .transform(canonicalPhone),
  })
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

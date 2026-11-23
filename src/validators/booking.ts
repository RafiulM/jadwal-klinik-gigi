import { z } from "zod";

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

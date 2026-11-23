import { z } from "zod";

const uuid = z.string().uuid();

export const doctorsQuerySchema = z.object({ serviceId: uuid }).strict();

export type DoctorsQuery = z.infer<typeof doctorsQuerySchema>;

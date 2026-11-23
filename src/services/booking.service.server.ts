import { asc, eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { services } from "@/db/schema";

// Booking publik (tanpa akun): hanya data yang boleh dilihat pasien.

export async function listActiveServices() {
  return db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMinutes: services.estimatedDurationMinutes,
      followUpDays: services.defaultFollowUpDays,
    })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.position), asc(services.name));
}

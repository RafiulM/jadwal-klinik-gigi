import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.server";
import { appointments, followUps, services } from "@/db/schema";
import { uniqueViolation } from "@/lib/db-errors.server";
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "@/validators/clinic";

// Kelola klinik untuk admin. Fungsi bersufiks Any dipanggil hanya dari
// endpoint yang dilindungi izin clinic:manage.

export class ClinicError extends Error {
  constructor(
    public reason:
      | "NOT_FOUND"
      | "SERVICE_NAME_TAKEN"
      | "SERVICE_IN_USE"
      | "DOCTOR_EMAIL_UNKNOWN"
      | "DOCTOR_EMAIL_TAKEN"
      | "SERVICE_UNKNOWN",
  ) {
    super(reason);
  }
}

const serviceColumns = {
  id: services.id,
  name: services.name,
  description: services.description,
  durationMinutes: services.estimatedDurationMinutes,
  followUpDays: services.defaultFollowUpDays,
  isActive: services.isActive,
};

export function listServicesAny() {
  return db
    .select(serviceColumns)
    .from(services)
    .orderBy(asc(services.position), asc(services.name));
}

function rethrowServiceName(error: unknown): never {
  if (uniqueViolation(error) === "services_name_lower_idx")
    throw new ClinicError("SERVICE_NAME_TAKEN");
  throw error;
}

/** Layanan baru tampil di booking dan diletakkan paling akhir. */
export async function createServiceAny(input: CreateServiceInput) {
  try {
    const [created] = await db
      .insert(services)
      .values({
        name: input.name,
        description: input.description,
        estimatedDurationMinutes: input.durationMinutes,
        defaultFollowUpDays: input.followUpDays,
        position: sql`(select coalesce(max(${services.position}), -1) + 1 from ${services})`,
      })
      .returning(serviceColumns);
    return created;
  } catch (error) {
    rethrowServiceName(error);
  }
}

/** Ubah data atau status tampil (isActive) layanan. */
export async function updateServiceAny(id: string, input: UpdateServiceInput) {
  try {
    const [updated] = await db
      .update(services)
      .set({
        name: input.name,
        description: input.description,
        estimatedDurationMinutes: input.durationMinutes,
        defaultFollowUpDays: input.followUpDays,
        isActive: input.isActive,
      })
      .where(eq(services.id, id))
      .returning(serviceColumns);
    if (!updated) throw new ClinicError("NOT_FOUND");
    return updated;
  } catch (error) {
    if (error instanceof ClinicError) throw error;
    rethrowServiceName(error);
  }
}

/**
 * Hapus layanan yang belum pernah dipakai. Layanan yang sudah punya janji
 * temu atau jadwal kontrol cukup disembunyikan (isActive = false) agar
 * riwayat pasien tetap utuh.
 */
export async function deleteServiceAny(id: string) {
  const [[used], [planned]] = await Promise.all([
    db
      .select({ total: count() })
      .from(appointments)
      .where(eq(appointments.serviceId, id)),
    db
      .select({ total: count() })
      .from(followUps)
      .where(eq(followUps.serviceId, id)),
  ]);
  if ((used?.total ?? 0) + (planned?.total ?? 0) > 0)
    throw new ClinicError("SERVICE_IN_USE");
  const deleted = await db
    .delete(services)
    .where(eq(services.id, id))
    .returning({ id: services.id });
  if (!deleted.length) throw new ClinicError("NOT_FOUND");
}

import { asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  appointments,
  doctorServices,
  doctors,
  followUps,
  services,
  user,
} from "@/db/schema";
import { uniqueViolation } from "@/lib/db-errors.server";
import type {
  CreateDoctorInput,
  CreateServiceInput,
  UpdateDoctorInput,
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
      | "SERVICE_UNKNOWN"
      | "DOCTOR_IN_USE",
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

// ---------------------------------------------------------------- Dokter

const doctorColumns = {
  id: doctors.id,
  name: doctors.name,
  specialization: doctors.specialization,
  phone: doctors.phone,
  isActive: doctors.isActive,
  accountEmail: user.email,
  serviceIds: sql<string[]>`coalesce(
    array_agg(${doctorServices.serviceId} order by ${doctorServices.serviceId})
      filter (where ${doctorServices.serviceId} is not null),
    '{}'
  )`,
};

function selectDoctors() {
  return db
    .select(doctorColumns)
    .from(doctors)
    .leftJoin(user, eq(user.id, doctors.userId))
    .leftJoin(doctorServices, eq(doctorServices.doctorId, doctors.id))
    .groupBy(doctors.id, user.email)
    .$dynamic();
}

export function listDoctorsAny() {
  return selectDoctors().orderBy(asc(doctors.name));
}

async function getDoctorAny(id: string) {
  const [doctor] = await selectDoctors().where(eq(doctors.id, id));
  return doctor ?? null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Cari akun login dari email; null berarti lepaskan tautan akun. */
async function accountIdFor(tx: Tx, email: string | null) {
  if (!email) return null;
  const [account] = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email))
    .limit(1);
  if (!account) throw new ClinicError("DOCTOR_EMAIL_UNKNOWN");
  return account.id;
}

async function replaceServices(tx: Tx, doctorId: string, serviceIds: string[]) {
  const known = await tx
    .select({ id: services.id })
    .from(services)
    .where(inArray(services.id, serviceIds));
  if (known.length !== serviceIds.length)
    throw new ClinicError("SERVICE_UNKNOWN");
  await tx.delete(doctorServices).where(eq(doctorServices.doctorId, doctorId));
  await tx
    .insert(doctorServices)
    .values(serviceIds.map((serviceId) => ({ doctorId, serviceId })));
}

function rethrowDoctor(error: unknown): never {
  if (error instanceof ClinicError) throw error;
  if (uniqueViolation(error) === "doctors_user_id_unique")
    throw new ClinicError("DOCTOR_EMAIL_TAKEN");
  throw error;
}

/** Dokter baru aktif, belum punya jam praktik (atur di tab Jam praktik). */
export async function createDoctorAny(input: CreateDoctorInput) {
  try {
    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(doctors)
        .values({
          name: input.name,
          specialization: input.specialization,
          phone: input.phone,
          userId: await accountIdFor(tx, input.accountEmail),
        })
        .returning({ id: doctors.id });
      await replaceServices(tx, created.id, input.serviceIds);
      return created.id;
    });
    return (await getDoctorAny(id))!;
  } catch (error) {
    rethrowDoctor(error);
  }
}

export async function updateDoctorAny(id: string, input: UpdateDoctorInput) {
  try {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(doctors)
        .set({
          name: input.name,
          specialization: input.specialization,
          phone: input.phone,
          isActive: input.isActive,
          ...(input.accountEmail !== undefined
            ? { userId: await accountIdFor(tx, input.accountEmail) }
            : {}),
        })
        .where(eq(doctors.id, id))
        .returning({ id: doctors.id });
      if (!updated) throw new ClinicError("NOT_FOUND");
      if (input.serviceIds) await replaceServices(tx, id, input.serviceIds);
    });
    return (await getDoctorAny(id))!;
  } catch (error) {
    rethrowDoctor(error);
  }
}

/** Hapus dokter yang belum pernah punya janji temu; selain itu nonaktifkan. */
export async function deleteDoctorAny(id: string) {
  const [[used], [planned]] = await Promise.all([
    db
      .select({ total: count() })
      .from(appointments)
      .where(eq(appointments.doctorId, id)),
    db
      .select({ total: count() })
      .from(followUps)
      .where(eq(followUps.doctorId, id)),
  ]);
  if ((used?.total ?? 0) + (planned?.total ?? 0) > 0)
    throw new ClinicError("DOCTOR_IN_USE");
  const deleted = await db
    .delete(doctors)
    .where(eq(doctors.id, id))
    .returning({ id: doctors.id });
  if (!deleted.length) throw new ClinicError("NOT_FOUND");
}

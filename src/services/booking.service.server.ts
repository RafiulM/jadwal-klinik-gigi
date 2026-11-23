import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  doctorSchedules,
  doctorServices,
  doctors,
  services,
} from "@/db/schema";

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

function hhmm(time: string) {
  return time.slice(0, 5);
}

// Dokter aktif yang melayani layanan aktif tersebut, beserta jam praktik mingguan.
export async function listDoctorsForService(serviceId: string) {
  const rows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      field: doctors.specialization,
    })
    .from(doctors)
    .innerJoin(doctorServices, eq(doctorServices.doctorId, doctors.id))
    .innerJoin(services, eq(services.id, doctorServices.serviceId))
    .where(
      and(
        eq(doctorServices.serviceId, serviceId),
        eq(doctors.isActive, true),
        eq(services.isActive, true),
      ),
    )
    .orderBy(asc(doctors.name));
  if (rows.length === 0) return [];

  const schedules = await db
    .select({
      doctorId: doctorSchedules.doctorId,
      dayOfWeek: doctorSchedules.dayOfWeek,
      startTime: doctorSchedules.startTime,
      endTime: doctorSchedules.endTime,
      slotIntervalMinutes: doctorSchedules.slotIntervalMinutes,
    })
    .from(doctorSchedules)
    .where(
      and(
        inArray(
          doctorSchedules.doctorId,
          rows.map((row) => row.id),
        ),
        eq(doctorSchedules.isActive, true),
      ),
    )
    .orderBy(asc(doctorSchedules.dayOfWeek), asc(doctorSchedules.startTime));

  return rows.map((doctor) => ({
    ...doctor,
    schedules: schedules
      .filter((s) => s.doctorId === doctor.id)
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: hhmm(s.startTime),
        endTime: hhmm(s.endTime),
        slotIntervalMinutes: s.slotIntervalMinutes,
      })),
  }));
}

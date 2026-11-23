import { and, asc, between, eq, inArray } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  addDays,
  clinicNow,
  dayOfWeek,
  fromMinutes,
  toMinutes,
} from "@/lib/clinic-time";
import type { AvailabilityQuery } from "@/validators/booking";
import {
  appointments,
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

export type SlotStatus = "available" | "taken" | "past";

// Slot per tanggal untuk satu dokter aktif. Jam yang sudah dipesan siapa pun
// (apa pun statusnya) tetap terisi; jam hari ini yang sudah lewat tidak bisa dipilih.
// Mengembalikan null bila dokter tidak ada atau sedang tidak menerima booking.
export async function getAvailability(
  { doctorId, from, days }: AvailabilityQuery,
  now = new Date(),
) {
  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(and(eq(doctors.id, doctorId), eq(doctors.isActive, true)))
    .limit(1);
  if (!doctor) return null;

  const today = clinicNow(now);
  const start = !from || from < today.date ? today.date : from;
  const end = addDays(start, days - 1);

  const [schedules, booked] = await Promise.all([
    db
      .select({
        dayOfWeek: doctorSchedules.dayOfWeek,
        startTime: doctorSchedules.startTime,
        endTime: doctorSchedules.endTime,
        slotIntervalMinutes: doctorSchedules.slotIntervalMinutes,
      })
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.doctorId, doctorId),
          eq(doctorSchedules.isActive, true),
        ),
      )
      .orderBy(asc(doctorSchedules.startTime)),
    db
      .select({
        date: appointments.appointmentDate,
        startTime: appointments.startTime,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          between(appointments.appointmentDate, start, end),
        ),
      ),
  ]);

  const taken = new Set(
    booked.map((row) => `${row.date}|${row.startTime.slice(0, 5)}`),
  );

  return {
    doctorId,
    from: start,
    days: Array.from({ length: days }, (_, i) => {
      const date = addDays(start, i);
      const dow = dayOfWeek(date);
      const slots = schedules
        .filter((s) => s.dayOfWeek === dow)
        .flatMap((s) => {
          const out: { time: string; status: SlotStatus }[] = [];
          for (
            let m = toMinutes(s.startTime);
            m < toMinutes(s.endTime);
            m += s.slotIntervalMinutes
          ) {
            const time = fromMinutes(m);
            const status: SlotStatus = taken.has(`${date}|${time}`)
              ? "taken"
              : date === today.date && m <= today.minutes
                ? "past"
                : "available";
            out.push({ time, status });
          }
          return out;
        })
        .sort((a, b) => a.time.localeCompare(b.time));
      return { date, dayOfWeek: dow, slots };
    }),
  };
}

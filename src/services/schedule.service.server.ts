import { and, asc, between, eq, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  appointments,
  doctorSchedules,
  doctors,
  followUps,
  patients,
  services,
} from "@/db/schema";
import { addDays, clinicNow, dayOfWeek } from "@/lib/clinic-time";

// Papan jadwal admin: janji temu semua dokter (lintas akun). Fungsi bersufiks
// Any hanya boleh dipanggil dari endpoint yang sudah memeriksa peran admin.

const hhmm = (time: string) => time.slice(0, 5);

function selectScheduleAppointments(where: SQL | undefined) {
  return db
    .select({
      id: appointments.id,
      code: appointments.code,
      date: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      followUpDate: followUps.dueDate,
      serviceId: services.id,
      serviceName: services.name,
      doctorId: doctors.id,
      doctorName: doctors.name,
      patientId: patients.id,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .leftJoin(followUps, eq(followUps.sourceAppointmentId, appointments.id))
    .where(where)
    .orderBy(
      asc(appointments.appointmentDate),
      asc(appointments.startTime),
      asc(doctors.name),
    );
}

type Row = Awaited<ReturnType<typeof selectScheduleAppointments>>[number];

function toScheduleAppointment(row: Row) {
  return {
    id: row.id,
    code: row.code,
    date: row.date,
    time: hhmm(row.startTime),
    endTime: hhmm(row.endTime),
    status: row.status,
    notes: row.notes ?? "",
    followUpDate: row.followUpDate ?? "",
    createdAt: row.createdAt.toISOString(),
    service: { id: row.serviceId, name: row.serviceName },
    doctor: { id: row.doctorId, name: row.doctorName },
    // Admin perlu nomor lengkap untuk menghubungi pasien.
    patient: {
      id: row.patientId,
      name: row.patientName,
      phone: row.patientPhone,
    },
  };
}

/**
 * Jadwal klinik untuk rentang `days` hari mulai `from` (default hari ini, zona
 * klinik), opsional untuk satu dokter. Mengembalikan hari, dokter beserta hari
 * praktiknya, daftar layanan untuk filter, dan janji temu urut tanggal/jam.
 */
export async function getScheduleAny(input: {
  from?: string;
  days: number;
  doctorId?: string;
}) {
  const today = clinicNow().date;
  const from = input.from ?? today;
  const to = addDays(from, input.days - 1);
  const days = Array.from({ length: input.days }, (_, i) => {
    const date = addDays(from, i);
    return { date, dayOfWeek: dayOfWeek(date) };
  });

  const rows = await selectScheduleAppointments(
    and(
      between(appointments.appointmentDate, from, to),
      input.doctorId ? eq(appointments.doctorId, input.doctorId) : undefined,
    ),
  );

  // Dokter aktif + dokter nonaktif yang masih punya janji di rentang ini.
  const doctorIdsWithAppointments = [...new Set(rows.map((r) => r.doctorId))];
  const doctorRows = await db
    .select({ id: doctors.id, name: doctors.name })
    .from(doctors)
    .where(
      and(
        input.doctorId ? eq(doctors.id, input.doctorId) : undefined,
        doctorIdsWithAppointments.length
          ? or(
              eq(doctors.isActive, true),
              inArray(doctors.id, doctorIdsWithAppointments),
            )
          : eq(doctors.isActive, true),
      ),
    )
    .orderBy(asc(doctors.name));

  const scheduleRows = doctorRows.length
    ? await db
        .select({
          doctorId: doctorSchedules.doctorId,
          dayOfWeek: doctorSchedules.dayOfWeek,
        })
        .from(doctorSchedules)
        .where(
          and(
            inArray(
              doctorSchedules.doctorId,
              doctorRows.map((d) => d.id),
            ),
            eq(doctorSchedules.isActive, true),
          ),
        )
    : [];

  const serviceRows = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .orderBy(asc(services.position), asc(services.name));

  return {
    today,
    from,
    days,
    doctors: doctorRows.map((d) => ({
      ...d,
      practiceDays: [
        ...new Set(
          scheduleRows
            .filter((s) => s.doctorId === d.id)
            .map((s) => s.dayOfWeek),
        ),
      ].sort(),
    })),
    services: serviceRows,
    appointments: rows.map(toScheduleAppointment),
  };
}

export type ScheduleWeek = Awaited<ReturnType<typeof getScheduleAny>>;

/** Satu janji temu untuk panel detail papan jadwal. */
export async function getScheduleAppointmentAny(id: string) {
  const [row] = await selectScheduleAppointments(eq(appointments.id, id));
  return row ? toScheduleAppointment(row) : null;
}

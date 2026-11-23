import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  appointments,
  doctorSchedules,
  doctors,
  patients,
  services,
} from "@/db/schema";
import { dayOfWeek } from "@/lib/clinic-time";
import { maskPhone } from "@/lib/phone";

// Data dokter yang login. Akun staf ditautkan ke baris `doctors` lewat user_id;
// semua query di bawah memakai doctorId hasil tautan itu, bukan input klien.

export async function findDoctorByUserId(userId: string) {
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name })
    .from(doctors)
    .where(and(eq(doctors.userId, userId), eq(doctors.isActive, true)))
    .limit(1);
  return doctor ?? null;
}

const hhmm = (time: string) => time.slice(0, 5);

/** Jadwal satu hari untuk satu dokter: jam praktik + janji temu urut jam. */
export async function getDoctorDay(
  doctor: { id: string; name: string },
  date: string,
) {
  const blocks = await db
    .select({
      startTime: doctorSchedules.startTime,
      endTime: doctorSchedules.endTime,
    })
    .from(doctorSchedules)
    .where(
      and(
        eq(doctorSchedules.doctorId, doctor.id),
        eq(doctorSchedules.dayOfWeek, dayOfWeek(date)),
        eq(doctorSchedules.isActive, true),
      ),
    )
    .orderBy(asc(doctorSchedules.startTime));

  const rows = await db
    .select({
      id: appointments.id,
      code: appointments.code,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      notes: appointments.notes,
      serviceId: services.id,
      serviceName: services.name,
      followUpDays: services.defaultFollowUpDays,
      patientId: patients.id,
      patientName: patients.name,
      patientPhone: patients.phone,
      // Pasien baru = belum pernah punya kunjungan selesai sebelum tanggal ini.
      firstVisit: sql<boolean>`not exists (
        select 1 from ${appointments} as prev
        where prev.patient_id = ${appointments.patientId}
          and prev.status = 'completed'
          and prev.appointment_date < ${appointments.appointmentDate}
      )`,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .where(
      and(
        eq(appointments.doctorId, doctor.id),
        eq(appointments.appointmentDate, date),
      ),
    )
    .orderBy(asc(appointments.startTime));

  return {
    date,
    doctor: {
      id: doctor.id,
      name: doctor.name,
      hours: blocks.length
        ? {
            start: hhmm(blocks[0].startTime),
            end: hhmm(blocks[blocks.length - 1].endTime),
          }
        : null,
    },
    appointments: rows.map((row) => ({
      id: row.id,
      code: row.code,
      time: hhmm(row.startTime),
      endTime: hhmm(row.endTime),
      status: row.status,
      notes: row.notes ?? "",
      followUpDate: "",
      service: {
        id: row.serviceId,
        name: row.serviceName,
        followUpDays: row.followUpDays,
      },
      patient: {
        id: row.patientId,
        name: row.patientName,
        phone: maskPhone(row.patientPhone),
        firstVisit: Boolean(row.firstVisit),
      },
    })),
  };
}

export type DoctorDay = Awaited<ReturnType<typeof getDoctorDay>>;

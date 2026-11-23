import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  appointments,
  doctorSchedules,
  doctors,
  patients,
  services,
} from "@/db/schema";
import { clinicNow, dayOfWeek } from "@/lib/clinic-time";
import { maskPhone } from "@/lib/phone";
import type { UpdateAppointmentInput } from "@/validators/doctor";

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

function selectAppointments(where: SQL | undefined) {
  return db
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
    .where(where)
    .orderBy(asc(appointments.startTime));
}

type AppointmentRow = Awaited<ReturnType<typeof selectAppointments>>[number];

function toAppointment(row: AppointmentRow) {
  return {
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
  };
}

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

  const rows = await selectAppointments(
    and(
      eq(appointments.doctorId, doctor.id),
      eq(appointments.appointmentDate, date),
    ),
  );

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
    appointments: rows.map(toAppointment),
  };
}

export type DoctorDay = Awaited<ReturnType<typeof getDoctorDay>>;

export class AppointmentUpdateError extends Error {
  constructor(public reason: "NOT_FOUND" | "NOT_STARTED") {
    super(reason);
  }
}

/**
 * Dokter menandai hasil kunjungan miliknya: selesai, tidak datang, atau
 * dikembalikan ke menunggu; sekaligus menyimpan catatan. Kunjungan di masa
 * depan tidak bisa ditandai selesai/tidak datang dan belum bisa diberi catatan.
 */
export async function updateDoctorAppointment(
  doctorId: string,
  userId: string,
  appointmentId: string,
  input: UpdateAppointmentInput,
) {
  const own = and(
    eq(appointments.id, appointmentId),
    eq(appointments.doctorId, doctorId),
  );
  const [current] = await db
    .select({
      date: appointments.appointmentDate,
      status: appointments.status,
    })
    .from(appointments)
    .where(own)
    .limit(1);
  if (!current) throw new AppointmentUpdateError("NOT_FOUND");

  const changes: Partial<typeof appointments.$inferInsert> = {};
  if (input.status !== undefined && input.status !== current.status) {
    if (input.status !== "scheduled" && current.date > clinicNow().date)
      throw new AppointmentUpdateError("NOT_STARTED");
    changes.status = input.status;
    changes.completedAt = input.status === "completed" ? new Date() : null;
    changes.statusChangedAt = new Date();
    changes.statusChangedBy = userId;
  }
  if (input.notes !== undefined) {
    if (current.date > clinicNow().date)
      throw new AppointmentUpdateError("NOT_STARTED");
    changes.notes = input.notes || null;
  }

  if (Object.keys(changes).length)
    await db.update(appointments).set(changes).where(own);

  const [row] = await selectAppointments(own);
  return toAppointment(row);
}

/** Catatan kunjungan milik dokter: isi catatan dan apakah sudah bisa diisi. */
export async function getDoctorVisitNote(
  doctorId: string,
  appointmentId: string,
) {
  const [row] = await db
    .select({
      notes: appointments.notes,
      date: appointments.appointmentDate,
      updatedAt: appointments.updatedAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.doctorId, doctorId),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    appointmentId,
    notes: row.notes ?? "",
    editable: row.date <= clinicNow().date,
    updatedAt: row.updatedAt.toISOString(),
  };
}

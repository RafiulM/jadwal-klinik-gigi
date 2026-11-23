import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  appointments,
  doctorSchedules,
  doctors,
  followUps,
  outboxEvents,
  patients,
  services,
} from "@/db/schema";
import { addDays, clinicNow, dayOfWeek } from "@/lib/clinic-time";
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
      date: appointments.appointmentDate,
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
      followUpDate: followUps.dueDate,
      followUpStatus: followUps.status,
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
    .leftJoin(followUps, eq(followUps.sourceAppointmentId, appointments.id))
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
    followUpDate: row.followUpDate ?? "",
    followUpStatus: row.followUpStatus,
    service: {
      id: row.serviceId,
      name: row.serviceName,
      // Interval kontrol rutin layanan (hari) dan saran tanggal kontrolnya
      // dihitung dari tanggal kunjungan; null bila layanan tanpa kontrol rutin.
      followUpDays: row.followUpDays,
      suggestedFollowUpDate: row.followUpDays
        ? addDays(row.date, row.followUpDays)
        : null,
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
  constructor(
    public reason:
      | "NOT_FOUND"
      | "NOT_STARTED"
      | "FOLLOW_UP_NEEDS_COMPLETED"
      | "FOLLOW_UP_DATE_RANGE"
      | "FOLLOW_UP_LOCKED",
  ) {
    super(reason);
  }
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/**
 * Dokter menandai hasil kunjungan miliknya: selesai, tidak datang, atau
 * dikembalikan ke menunggu; sekaligus menyimpan catatan dan tanggal kontrol
 * berikutnya (tabel follow_ups). Semua perubahan terjadi dalam satu transaksi.
 *
 * Aturan:
 * - Kunjungan yang belum tiba tidak bisa ditandai atau diberi catatan.
 * - Tanggal kontrol hanya untuk kunjungan selesai, setelah hari ini dan paling
 *   lambat 2 tahun lagi. Kontrol yang sudah dibooking/dijalani tidak diubah.
 * - Membatalkan tanda selesai menghapus kontrol yang belum dibooking.
 * - Menandai selesai kunjungan yang merupakan booking kontrol menutup kontrol
 *   itu (done); membatalkannya mengembalikan ke booked.
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
  const today = clinicNow().date;

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        date: appointments.appointmentDate,
        status: appointments.status,
        patientId: appointments.patientId,
        serviceId: appointments.serviceId,
      })
      .from(appointments)
      .where(own)
      .for("update")
      .limit(1);
    if (!current) throw new AppointmentUpdateError("NOT_FOUND");
    const started = current.date <= today;
    const nextStatus = input.status ?? current.status;

    const changes: Partial<typeof appointments.$inferInsert> = {};
    if (input.status !== undefined && input.status !== current.status) {
      if (input.status !== "scheduled" && !started)
        throw new AppointmentUpdateError("NOT_STARTED");
      changes.status = input.status;
      changes.completedAt = input.status === "completed" ? new Date() : null;
      changes.statusChangedAt = new Date();
      changes.statusChangedBy = userId;
    }
    if (input.notes !== undefined) {
      if (!started) throw new AppointmentUpdateError("NOT_STARTED");
      changes.notes = input.notes || null;
    }
    if (Object.keys(changes).length)
      await tx.update(appointments).set(changes).where(own);

    const [existing] = await tx
      .select({ id: followUps.id, status: followUps.status })
      .from(followUps)
      .where(eq(followUps.sourceAppointmentId, appointmentId))
      .limit(1);

    // Tanda selesai dibatalkan: kontrol yang belum dibooking ikut dihapus.
    if (nextStatus !== "completed" && existing?.status === "pending")
      await tx.delete(followUps).where(eq(followUps.id, existing.id));

    if (input.followUpDate !== undefined) {
      if (nextStatus !== "completed")
        throw new AppointmentUpdateError("FOLLOW_UP_NEEDS_COMPLETED");
      if (existing && existing.status !== "pending")
        throw new AppointmentUpdateError("FOLLOW_UP_LOCKED");
      const dueDate = input.followUpDate || null;
      if (dueDate && (dueDate <= today || dueDate > addDays(today, 730)))
        throw new AppointmentUpdateError("FOLLOW_UP_DATE_RANGE");

      if (!dueDate) {
        if (existing)
          await tx.delete(followUps).where(eq(followUps.id, existing.id));
      } else {
        const values = {
          dueDate,
          intervalDays: daysBetween(current.date, dueDate),
        };
        const [saved] = existing
          ? await tx
              .update(followUps)
              .set(values)
              .where(eq(followUps.id, existing.id))
              .returning({ id: followUps.id })
          : await tx
              .insert(followUps)
              .values({
                ...values,
                patientId: current.patientId,
                serviceId: current.serviceId,
                doctorId,
                sourceAppointmentId: appointmentId,
                createdBy: userId,
              })
              .returning({ id: followUps.id });
        // n8n menjadwalkan pengingat kontrol ke pasien dari event ini.
        await tx.insert(outboxEvents).values({
          eventType: "follow_up_scheduled",
          appointmentId,
          payload: { followUpId: saved.id, appointmentId, dueDate },
        });
      }
    }

    // Kunjungan ini sendiri adalah booking kontrol: selesai → kontrol done.
    if (changes.status !== undefined)
      await tx
        .update(followUps)
        .set({ status: nextStatus === "completed" ? "done" : "booked" })
        .where(
          and(
            eq(followUps.bookedAppointmentId, appointmentId),
            inArray(followUps.status, ["booked", "done"]),
          ),
        );
  });

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

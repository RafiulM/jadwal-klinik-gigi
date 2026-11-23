import { asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/index.server";
import {
  appointments,
  doctors,
  followUps,
  patients,
  services,
} from "@/db/schema";
import { maskPhone } from "@/lib/phone";

// Jadwal kontrol berikutnya dan riwayat kunjungan pasien (khusus staf klinik).

const sourceVisit = alias(appointments, "source_visit");

const followUpColumns = {
  id: followUps.id,
  dueDate: followUps.dueDate,
  status: followUps.status,
  notes: followUps.notes,
  sourceVisitId: followUps.sourceAppointmentId,
  sourceVisitDate: sourceVisit.appointmentDate,
  bookedAppointmentId: followUps.bookedAppointmentId,
  serviceId: services.id,
  serviceName: services.name,
  doctorId: doctors.id,
  doctorName: doctors.name,
  patientId: patients.id,
  patientName: patients.name,
  patientPhone: patients.phone,
};

export function selectFollowUps() {
  return db
    .select(followUpColumns)
    .from(followUps)
    .innerJoin(services, eq(services.id, followUps.serviceId))
    .innerJoin(doctors, eq(doctors.id, followUps.doctorId))
    .innerJoin(patients, eq(patients.id, followUps.patientId))
    .leftJoin(sourceVisit, eq(sourceVisit.id, followUps.sourceAppointmentId))
    .$dynamic();
}

type FollowUpRow = Awaited<ReturnType<typeof selectFollowUps>>[number];

export function toFollowUp(row: FollowUpRow, phone: (value: string) => string) {
  return {
    id: row.id,
    dueDate: row.dueDate,
    status: row.status,
    notes: row.notes,
    sourceVisitId: row.sourceVisitId,
    sourceVisitDate: row.sourceVisitDate,
    bookedAppointmentId: row.bookedAppointmentId,
    service: { id: row.serviceId, name: row.serviceName },
    doctor: { id: row.doctorId, name: row.doctorName },
    patient: {
      id: row.patientId,
      name: row.patientName,
      phone: phone(row.patientPhone),
    },
  };
}

const hhmm = (time: string) => time.slice(0, 5);

/**
 * Riwayat satu pasien: semua kunjungan (terbaru dulu) beserta catatan dan
 * tanggal kontrol yang ditetapkan, plus semua data kontrolnya. Nomor HP
 * disamarkan.
 */
export async function getPatientHistoryAny(patientId: string) {
  const [patient] = await db
    .select({ id: patients.id, name: patients.name, phone: patients.phone })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);
  if (!patient) return null;

  const visits = await db
    .select({
      id: appointments.id,
      date: appointments.appointmentDate,
      time: appointments.startTime,
      service: services.name,
      doctor: doctors.name,
      status: appointments.status,
      notes: appointments.notes,
      followUpDate: followUps.dueDate,
    })
    .from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .leftJoin(followUps, eq(followUps.sourceAppointmentId, appointments.id))
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(appointments.appointmentDate), desc(appointments.startTime));

  const followUpRows = await selectFollowUps()
    .where(eq(followUps.patientId, patientId))
    .orderBy(desc(followUps.dueDate));

  return {
    patient: { ...patient, phone: maskPhone(patient.phone) },
    visits: visits.map((visit) => ({
      ...visit,
      time: hhmm(visit.time),
      notes: visit.notes ?? "",
      followUpDate: visit.followUpDate,
    })),
    followUps: followUpRows.map((row) => toFollowUp(row, maskPhone)),
  };
}

export type PatientHistory = NonNullable<
  Awaited<ReturnType<typeof getPatientHistoryAny>>
>;

/**
 * Daftar kontrol untuk halaman Kontrol pasien: yang belum booking dulu, lalu
 * jatuh tempo paling awal. Nomor HP utuh karena staf perlu menghubungi pasien
 * yang belum booking. Kontrol selesai hanya yang 90 hari terakhir.
 */
export async function listFollowUpsAny(today: string) {
  const rows = await selectFollowUps()
    .where(
      sql`${followUps.status} <> 'done' or ${followUps.dueDate} >= (${today}::date - 90)`,
    )
    .orderBy(
      sql`case ${followUps.status} when 'pending' then 0 when 'booked' then 1 else 2 end`,
      asc(followUps.dueDate),
    )
    .limit(500);
  return rows.map((row) => toFollowUp(row, (phone) => phone));
}

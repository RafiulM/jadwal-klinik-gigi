import { randomInt } from "node:crypto";
import { and, asc, between, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index.server";
import { maskPhone } from "@/lib/phone";
import {
  addDays,
  clinicNow,
  dayOfWeek,
  fromMinutes,
  toMinutes,
} from "@/lib/clinic-time";
import type {
  AvailabilityQuery,
  CreateBookingInput,
} from "@/validators/booking";
import {
  appointments,
  outboxEvents,
  patients,
  doctorSchedules,
  doctorServices,
  doctors,
  followUps,
  services,
} from "@/db/schema";

// Booking publik (tanpa akun): hanya data yang boleh dilihat pasien.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Status kontrol diturunkan dari jadwal: booking baru untuk layanan yang sama
 * memenuhi kontrol pasien yang masih "pending" (jatuh tempo paling awal) dan
 * mengubahnya menjadi "booked". n8n diberi tahu agar berhenti mengingatkan.
 */
async function linkFollowUpBooking(
  tx: Tx,
  input: { patientId: string; serviceId: string; appointmentId: string },
) {
  const [followUp] = await tx
    .select({ id: followUps.id })
    .from(followUps)
    .where(
      and(
        eq(followUps.patientId, input.patientId),
        eq(followUps.serviceId, input.serviceId),
        eq(followUps.status, "pending"),
      ),
    )
    .orderBy(asc(followUps.dueDate))
    .for("update")
    .limit(1);
  if (!followUp) return;
  await tx
    .update(followUps)
    .set({ status: "booked", bookedAppointmentId: input.appointmentId })
    .where(eq(followUps.id, followUp.id));
  await tx.insert(outboxEvents).values({
    eventType: "follow_up_booked",
    appointmentId: input.appointmentId,
    payload: { followUpId: followUp.id, appointmentId: input.appointmentId },
  });
}

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

// --- Simpan janji temu --------------------------------------------------------

export class BookingError extends Error {
  constructor(
    public reason:
      | "service_unavailable"
      | "doctor_unavailable"
      | "slot_invalid"
      | "slot_past"
      | "slot_taken",
  ) {
    super(reason);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newBookingCode() {
  let code = "JK-";
  for (let i = 0; i < 6; i++)
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

function uniqueViolation(error: unknown): string | null {
  for (
    let e: unknown = error;
    e && typeof e === "object";
    e = (e as { cause?: unknown }).cause
  ) {
    const pg = e as { code?: string; constraint?: string };
    if (pg.code === "23505") return pg.constraint ?? "";
  }
  return null;
}

// Satu transaksi: cek ulang layanan/dokter/slot, simpan pasien (berdasarkan
// nomor HP), simpan janji temu, dan tulis event outbox untuk n8n. Unique index
// dokter+tanggal+jam menolak pemesanan ganda meskipun dua pasien menekan
// Konfirmasi pada saat yang sama.
export async function createBooking(
  input: CreateBookingInput,
  now = new Date(),
) {
  const today = clinicNow(now);
  const startMinutes = toMinutes(input.time);
  if (
    input.date < today.date ||
    (input.date === today.date && startMinutes <= today.minutes)
  )
    throw new BookingError("slot_past");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const [service] = await tx
          .select({ id: services.id, name: services.name })
          .from(services)
          .where(
            and(eq(services.id, input.serviceId), eq(services.isActive, true)),
          )
          .limit(1);
        if (!service) throw new BookingError("service_unavailable");

        const [doctor] = await tx
          .select({ id: doctors.id, name: doctors.name })
          .from(doctors)
          .innerJoin(doctorServices, eq(doctorServices.doctorId, doctors.id))
          .where(
            and(
              eq(doctors.id, input.doctorId),
              eq(doctors.isActive, true),
              eq(doctorServices.serviceId, service.id),
            ),
          )
          .limit(1);
        if (!doctor) throw new BookingError("doctor_unavailable");

        const schedules = await tx
          .select({
            startTime: doctorSchedules.startTime,
            endTime: doctorSchedules.endTime,
            slotIntervalMinutes: doctorSchedules.slotIntervalMinutes,
          })
          .from(doctorSchedules)
          .where(
            and(
              eq(doctorSchedules.doctorId, doctor.id),
              eq(doctorSchedules.dayOfWeek, dayOfWeek(input.date)),
              eq(doctorSchedules.isActive, true),
            ),
          );
        const schedule = schedules.find((s) => {
          const from = toMinutes(s.startTime);
          return (
            startMinutes >= from &&
            startMinutes < toMinutes(s.endTime) &&
            (startMinutes - from) % s.slotIntervalMinutes === 0
          );
        });
        if (!schedule) throw new BookingError("slot_invalid");
        const endTime = fromMinutes(
          startMinutes + schedule.slotIntervalMinutes,
        );

        const [patient] = await tx
          .insert(patients)
          .values({ name: input.name, phone: input.phone })
          .onConflictDoUpdate({
            target: patients.phone,
            set: { name: input.name, updatedAt: sql`now()` },
          })
          .returning({
            id: patients.id,
            name: patients.name,
            phone: patients.phone,
          });

        const [appointment] = await tx
          .insert(appointments)
          .values({
            code: newBookingCode(),
            patientId: patient.id,
            doctorId: doctor.id,
            serviceId: service.id,
            appointmentDate: input.date,
            startTime: input.time,
            endTime,
          })
          .returning({
            id: appointments.id,
            code: appointments.code,
            date: appointments.appointmentDate,
            startTime: appointments.startTime,
            endTime: appointments.endTime,
          });

        const booking = {
          code: appointment.code,
          date: appointment.date,
          time: appointment.startTime.slice(0, 5),
          endTime: appointment.endTime.slice(0, 5),
          serviceName: service.name,
          doctorName: doctor.name,
          patientName: patient.name,
          patientPhone: patient.phone,
        };

        await tx.insert(outboxEvents).values({
          eventType: "appointment_created",
          appointmentId: appointment.id,
          payload: { appointmentId: appointment.id, ...booking },
        });

        await linkFollowUpBooking(tx, {
          patientId: patient.id,
          serviceId: service.id,
          appointmentId: appointment.id,
        });

        return booking;
      });
    } catch (error) {
      const constraint = uniqueViolation(error);
      if (constraint === "appointments_doctor_date_start_idx")
        throw new BookingError("slot_taken");
      // Kode booking acak bentrok (sangat jarang): coba lagi dengan kode baru.
      if (constraint === "appointments_code_unique") continue;
      throw error;
    }
  }
  throw new Error("Could not allocate a unique booking code.");
}

// --- Detail janji temu dari kode booking (nomor janji) --------------------------

// Kode booking adalah bukti yang dipegang pasien. Nomor HP disamarkan karena
// siapa pun yang memegang kode bisa membuka halaman ini.
export async function getBookingByCode(code: string) {
  const [row] = await db
    .select({
      code: appointments.code,
      date: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      serviceName: services.name,
      doctorName: doctors.name,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(eq(appointments.code, code))
    .limit(1);
  if (!row) return null;
  return {
    code: row.code,
    date: row.date,
    time: row.startTime.slice(0, 5),
    endTime: row.endTime.slice(0, 5),
    status: row.status,
    serviceName: row.serviceName,
    doctorName: row.doctorName,
    patientName: row.patientName,
    patientPhone: maskPhone(row.patientPhone),
  };
}

import { and, asc, eq, inArray, lt, lte, or, sql, isNull } from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  appointments,
  doctors,
  followUps,
  outboxEvents,
  patients,
  services,
} from "@/db/schema";
import { addDays, clinicNow } from "@/lib/clinic-time";
import { siteOrigin } from "@/lib/session.server";
import { formatLongDate } from "@/features/booking/format";
import type { AckOutboxInput } from "@/validators/integration";
import { getDailyReportAny } from "./report.service.server";

// Data untuk n8n (lintas akun). Hanya dipanggil dari endpoint yang memeriksa
// N8N_API_KEY. Nomor HP dikirim utuh karena n8n yang menghubungi pasien.

export class IntegrationError extends Error {
  constructor(public reason: "NOT_FOUND" | "NOT_CLAIMED" | "NOT_PENDING") {
    super(reason);
  }
}

const hhmm = (time: string) => time.slice(0, 5);
const LEASE_MINUTES = 10;

/**
 * Ambil event outbox yang siap dikirim dan kunci sementara (status
 * processing, sewa 10 menit). Event yang tidak di-ack sebelum sewa habis akan
 * diambil lagi, jadi n8n yang mati di tengah jalan tidak menghilangkan pesan.
 * Event kontrol diperkaya dengan data pasien, layanan, dan dokter.
 */
export async function claimOutboxEventsAny(limit: number) {
  const claimed = await db.execute<{
    id: string;
    event_type: string;
    payload: Record<string, unknown>;
    created_at: Date;
    attempts: number;
  }>(sql`
    with picked as (
      select id from ${outboxEvents}
      where ${outboxEvents.status} in ('pending', 'processing')
        and ${outboxEvents.availableAt} <= now()
      order by ${outboxEvents.createdAt}
      limit ${limit}
      for update skip locked
    )
    update ${outboxEvents} as o
    set status = 'processing',
        attempts = o.attempts + 1,
        available_at = now() + make_interval(mins => ${LEASE_MINUTES})
    from picked
    where o.id = picked.id
    returning o.id, o.event_type, o.payload, o.created_at, o.attempts
  `);
  const rows = [...claimed.rows].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const followUpIds = rows
    .map((r) => r.payload.followUpId)
    .filter((id): id is string => typeof id === "string");
  const details = followUpIds.length
    ? await db
        .select({
          id: followUps.id,
          dueDate: followUps.dueDate,
          status: followUps.status,
          patientName: patients.name,
          patientPhone: patients.phone,
          serviceName: services.name,
          doctorName: doctors.name,
        })
        .from(followUps)
        .innerJoin(patients, eq(patients.id, followUps.patientId))
        .innerJoin(services, eq(services.id, followUps.serviceId))
        .innerJoin(doctors, eq(doctors.id, followUps.doctorId))
        .where(inArray(followUps.id, followUpIds))
    : [];
  const origin = siteOrigin();

  return rows.map((row) => {
    const payload = { ...row.payload };
    if (typeof payload.code === "string")
      payload.proofUrl = `${origin}/janji/${payload.code}`;
    const followUp = details.find((d) => d.id === payload.followUpId);
    if (followUp)
      Object.assign(payload, {
        followUpDueDate: followUp.dueDate,
        followUpStatus: followUp.status,
        patientName: followUp.patientName,
        patientPhone: followUp.patientPhone,
        serviceName: followUp.serviceName,
        doctorName: followUp.doctorName,
        bookingUrl: `${origin}/`,
      });
    return {
      id: row.id,
      eventType: row.event_type,
      attempts: row.attempts,
      createdAt: new Date(row.created_at).toISOString(),
      payload,
    };
  });
}

/** Laporan hasil kirim dari n8n untuk satu event yang sedang diproses. */
export async function ackOutboxEventAny(id: string, input: AckOutboxInput) {
  const [current] = await db
    .select({ status: outboxEvents.status })
    .from(outboxEvents)
    .where(eq(outboxEvents.id, id))
    .limit(1);
  if (!current) throw new IntegrationError("NOT_FOUND");
  if (current.status !== "processing")
    throw new IntegrationError("NOT_CLAIMED");

  const changes =
    input.result === "sent"
      ? { status: "sent" as const, processedAt: new Date(), lastError: null }
      : input.result === "failed"
        ? {
            status: "failed" as const,
            processedAt: new Date(),
            lastError: input.error ?? "Gagal dikirim n8n.",
          }
        : {
            status: "pending" as const,
            availableAt: new Date(
              Date.now() + (input.retryAfterSeconds ?? 900) * 1000,
            ),
            lastError: input.error ?? null,
          };
  const [updated] = await db
    .update(outboxEvents)
    .set(changes)
    .where(and(eq(outboxEvents.id, id), eq(outboxEvents.status, "processing")))
    .returning({
      id: outboxEvents.id,
      status: outboxEvents.status,
      availableAt: outboxEvents.availableAt,
    });
  if (!updated) throw new IntegrationError("NOT_CLAIMED");
  return { ...updated, availableAt: updated.availableAt.toISOString() };
}

/**
 * Janji temu yang masih menunggu pada satu tanggal (default besok, zona
 * klinik) untuk pengingat H-1 ke pasien.
 */
export async function listAppointmentRemindersAny(date?: string) {
  const day = date ?? addDays(clinicNow().date, 1);
  const origin = siteOrigin();
  const rows = await db
    .select({
      appointmentId: appointments.id,
      code: appointments.code,
      date: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      patientName: patients.name,
      patientPhone: patients.phone,
      serviceName: services.name,
      doctorName: doctors.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(
      and(
        eq(appointments.appointmentDate, day),
        eq(appointments.status, "scheduled"),
      ),
    )
    .orderBy(asc(appointments.startTime), asc(doctors.name));
  return {
    date: day,
    dateLabel: formatLongDate(day),
    appointments: rows.map((r) => ({
      ...r,
      startTime: hhmm(r.startTime),
      endTime: hhmm(r.endTime),
      proofUrl: `${origin}/janji/${r.code}`,
    })),
  };
}

const MAX_FOLLOW_UP_REMINDERS = 3;

/**
 * Kontrol yang jatuh tempo (sampai `date`, default hari ini) dan pasiennya
 * belum booking. Satu kontrol diingatkan paling banyak 3 kali, berjarak
 * minimal 7 hari; tandai terkirim lewat markFollowUpRemindedAny.
 */
export async function listDueFollowUpsAny(date?: string) {
  const day = date ?? clinicNow().date;
  const origin = siteOrigin();
  const rows = await db
    .select({
      followUpId: followUps.id,
      dueDate: followUps.dueDate,
      reminderCount: followUps.reminderCount,
      lastRemindedAt: followUps.lastRemindedAt,
      patientName: patients.name,
      patientPhone: patients.phone,
      serviceName: services.name,
      doctorName: doctors.name,
    })
    .from(followUps)
    .innerJoin(patients, eq(patients.id, followUps.patientId))
    .innerJoin(services, eq(services.id, followUps.serviceId))
    .innerJoin(doctors, eq(doctors.id, followUps.doctorId))
    .where(
      and(
        eq(followUps.status, "pending"),
        lte(followUps.dueDate, day),
        lt(followUps.reminderCount, MAX_FOLLOW_UP_REMINDERS),
        or(
          isNull(followUps.lastRemindedAt),
          lt(followUps.lastRemindedAt, sql`now() - interval '7 days'`),
        ),
      ),
    )
    .orderBy(asc(followUps.dueDate));
  return {
    date: day,
    followUps: rows.map((r) => ({
      ...r,
      dueDateLabel: formatLongDate(r.dueDate),
      lastRemindedAt: r.lastRemindedAt?.toISOString() ?? null,
      bookingUrl: `${origin}/`,
    })),
  };
}

/** Catat bahwa pengingat kontrol sudah dikirim n8n. */
export async function markFollowUpRemindedAny(id: string) {
  const [current] = await db
    .select({ status: followUps.status })
    .from(followUps)
    .where(eq(followUps.id, id))
    .limit(1);
  if (!current) throw new IntegrationError("NOT_FOUND");
  if (current.status !== "pending") throw new IntegrationError("NOT_PENDING");
  const [updated] = await db
    .update(followUps)
    .set({
      lastRemindedAt: new Date(),
      reminderCount: sql`${followUps.reminderCount} + 1`,
    })
    .where(eq(followUps.id, id))
    .returning({
      id: followUps.id,
      reminderCount: followUps.reminderCount,
      lastRemindedAt: followUps.lastRemindedAt,
    });
  return {
    ...updated,
    lastRemindedAt: updated.lastRemindedAt?.toISOString() ?? null,
  };
}

/**
 * Rekap satu hari untuk pemilik (default hari ini) plus teks siap kirim
 * berbahasa Indonesia.
 */
export async function getDailyRecapAny(date?: string) {
  const report = await getDailyReportAny({ date, days: 1 });
  const day = report.days[0];
  const lines = [
    `Rekap ${formatLongDate(day.date)}`,
    `Janji temu: ${day.total} · Selesai: ${day.completed} · Tidak datang: ${day.noShow} · Belum ditangani: ${day.waiting}`,
    ...day.doctors.map(
      (d) =>
        `- ${d.name}: ${d.total} janji, ${d.completed} selesai, ${d.noShow} tidak datang, ${d.waiting} belum ditangani`,
    ),
  ];
  if (!day.doctors.length)
    lines.push(
      day.practicingDoctors
        ? "Tidak ada janji temu hari ini."
        : "Klinik tutup hari ini.",
    );
  return {
    date: day.date,
    dateLabel: formatLongDate(day.date),
    total: day.total,
    completed: day.completed,
    noShow: day.noShow,
    waiting: day.waiting,
    doctors: day.doctors,
    text: lines.join("\n"),
    reportUrl: `${siteOrigin()}/rekap?tanggal=${day.date}`,
  };
}

import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { appointments } from "./appointments";
import { doctors } from "./doctors";
import { patients } from "./patients";
import { services } from "./services";
import { user } from "./user";

// pending = pasien belum booking, booked = sudah punya janji temu kontrol,
// done = kontrol sudah dijalani (janji temunya ditandai selesai).
export const followUpStatus = pgEnum("follow_up_status", [
  "pending",
  "booked",
  "done",
]);

// Jadwal kontrol berikutnya yang ditetapkan dokter setelah kunjungan, mis.
// kontrol behel tiap 30 hari atau scaling tiap 180 hari. n8n memakai data ini
// untuk mengirim pengingat kontrol ke pasien saat jatuh tempo.
export const followUps = pgTable(
  "follow_ups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "restrict" }),
    // Kunjungan yang menetapkan kontrol ini; satu kunjungan, satu kontrol.
    sourceAppointmentId: uuid("source_appointment_id")
      .unique()
      .references(() => appointments.id, { onDelete: "set null" }),
    // Janji temu yang dibooking pasien untuk memenuhi kontrol ini.
    bookedAppointmentId: uuid("booked_appointment_id").references(
      () => appointments.id,
      { onDelete: "restrict" },
    ),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    // Interval yang dipakai saat menetapkan tanggal (null bila tanggal dipilih manual).
    intervalDays: integer("interval_days"),
    status: followUpStatus("status").default("pending").notNull(),
    notes: text("notes").default("").notNull(),
    // Pengingat kontrol dari n8n: kapan terakhir dikirim dan berapa kali.
    lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
    reminderCount: integer("reminder_count").default(0).notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("follow_ups_status_due_idx").on(table.status, table.dueDate),
    index("follow_ups_patient_idx").on(table.patientId),
    check(
      "follow_ups_interval_check",
      sql`${table.intervalDays} is null or ${table.intervalDays} between 1 and 730`,
    ),
    check(
      "follow_ups_booked_check",
      sql`${table.status} <> 'booked' or ${table.bookedAppointmentId} is not null`,
    ),
    check("follow_ups_notes_length", sql`char_length(${table.notes}) <= 2000`),
  ],
);

import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { doctors } from "./doctors";
import { patients } from "./patients";
import { services } from "./services";

export const appointmentStatus = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "no_show",
]);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Kode bukti booking yang ditunjukkan pasien saat datang.
    code: varchar("code", { length: 16 }).notNull().unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    appointmentDate: date("appointment_date", { mode: "string" }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    status: appointmentStatus("status").default("scheduled").notNull(),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Satu slot dokter hanya untuk satu pasien: database menolak double booking.
    uniqueIndex("appointments_doctor_date_start_idx").on(
      table.doctorId,
      table.appointmentDate,
      table.startTime,
    ),
    index("appointments_date_idx").on(table.appointmentDate, table.startTime),
    index("appointments_patient_idx").on(table.patientId),
  ],
);

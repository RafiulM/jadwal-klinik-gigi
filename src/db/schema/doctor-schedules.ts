import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  smallint,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { doctors } from "./doctors";

// Jam praktik mingguan per dokter. day_of_week: 0 = Minggu … 6 = Sabtu.
export const doctorSchedules = pgTable(
  "doctor_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    slotIntervalMinutes: integer("slot_interval_minutes").default(30).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("doctor_schedules_doctor_day_start_idx").on(
      table.doctorId,
      table.dayOfWeek,
      table.startTime,
    ),
    check(
      "doctor_schedules_day_check",
      sql`${table.dayOfWeek} between 0 and 6`,
    ),
    check(
      "doctor_schedules_time_check",
      sql`${table.endTime} > ${table.startTime}`,
    ),
    check(
      "doctor_schedules_interval_check",
      sql`${table.slotIntervalMinutes} between 5 and 240`,
    ),
  ],
);

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Layanan yang bisa dipilih pasien di halaman booking (mis. scaling, kontrol behel).
export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description").default("").notNull(),
    // Saran interval kontrol rutin; null berarti tidak ada saran.
    defaultFollowUpDays: integer("default_follow_up_days"),
    estimatedDurationMinutes: integer("estimated_duration_minutes")
      .default(30)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    position: smallint("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Interval kontrol rutin wajar: 1 hari sampai 2 tahun.
    check(
      "services_follow_up_days_check",
      sql`${table.defaultFollowUpDays} is null or ${table.defaultFollowUpDays} between 1 and 730`,
    ),
  ],
);

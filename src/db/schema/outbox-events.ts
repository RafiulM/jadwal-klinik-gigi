import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appointments } from "./appointments";

export const outboxStatus = pgEnum("outbox_status", [
  "pending",
  "processing",
  "sent",
  "failed",
]);

// Event untuk n8n (pengingat WhatsApp, rekap). Ditulis dalam transaksi yang sama
// dengan perubahan data, jadi booking tetap jalan walau n8n sedang mati.
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: outboxStatus("status").default("pending").notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("outbox_events_status_available_idx").on(
      table.status,
      table.availableAt,
    ),
  ],
);

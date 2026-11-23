import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Pasien tanpa akun. Dikenali dari nomor HP yang sudah dinormalisasi (08…).
export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

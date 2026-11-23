import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

// Dokter yang menerima janji temu. `userId` menautkan akun login dokter bila ada.
export const doctors = pgTable("doctors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).default("").notNull(),
  specialization: varchar("specialization", { length: 120 })
    .default("")
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { doctors } from "./doctors";
import { services } from "./services";

// Layanan yang ditangani tiap dokter; dipakai untuk menyaring dokter di booking.
export const doctorServices = pgTable(
  "doctor_services",
  {
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.doctorId, table.serviceId] })],
);

// Data awal klinik: layanan, dokter, layanan per dokter, dan jam praktik.
// npm run db:seed
//
// Aman dijalankan berulang: hanya mengisi bila tabel layanan dan dokter masih
// kosong, jadi data yang sudah diubah admin tidak pernah ditimpa. Nama dokter
// adalah contoh; ganti lewat halaman Kelola klinik setelah login admin.
import { Pool } from "pg";
import { loadEnvironment } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";

const SERVICES = [
  {
    key: "scaling",
    name: "Scaling",
    description: "Membersihkan karang gigi dan plak.",
    duration: 45,
    followUp: 180,
  },
  {
    key: "behel",
    name: "Kontrol behel",
    description: "Cek dan pengencangan kawat behel.",
    duration: 30,
    followUp: 30,
  },
  {
    key: "tambal",
    name: "Tambal gigi",
    description: "Menambal gigi berlubang atau retak.",
    duration: 45,
    followUp: null,
  },
  {
    key: "periksa",
    name: "Periksa & konsultasi",
    description: "Cek kondisi gigi dan bahas keluhan Anda.",
    duration: 30,
    followUp: null,
  },
];

const DOCTORS = [
  {
    name: "drg. Rina Pratiwi",
    specialization: "Dokter gigi umum",
    services: ["scaling", "tambal", "periksa"],
    days: [1, 3, 5],
    start: "09:00",
    end: "14:00",
  },
  {
    name: "drg. Bagus Setiawan, Sp.Ort",
    specialization: "Spesialis ortodonti (behel)",
    services: ["behel", "periksa"],
    days: [2, 4, 6],
    start: "13:00",
    end: "18:00",
  },
  {
    name: "drg. Maya Lestari",
    specialization: "Dokter gigi umum",
    services: ["scaling", "tambal", "periksa"],
    days: [1, 2, 4, 6],
    start: "16:00",
    end: "20:00",
  },
];

await loadEnvironment();
const pool = new Pool({
  connectionString: databaseUrl(),
  max: 1,
  connectionTimeoutMillis: 5000,
});
pool.on("error", () => {});
const client = await pool.connect().catch((error) => {
  console.error(databaseError(error));
  process.exit(1);
});

try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    "SELECT (SELECT count(*) FROM services)::int AS services, (SELECT count(*) FROM doctors)::int AS doctors",
  );
  if (rows[0].services > 0 || rows[0].doctors > 0) {
    await client.query("ROLLBACK");
    console.log(
      `Data klinik sudah ada (${rows[0].services} layanan, ${rows[0].doctors} dokter). Tidak ada yang diubah.`,
    );
  } else {
    const serviceIds = {};
    for (const [position, s] of SERVICES.entries()) {
      const inserted = await client.query(
        `INSERT INTO services (name, description, estimated_duration_minutes, default_follow_up_days, position)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [s.name, s.description, s.duration, s.followUp, position],
      );
      serviceIds[s.key] = inserted.rows[0].id;
    }
    for (const d of DOCTORS) {
      const inserted = await client.query(
        "INSERT INTO doctors (name, specialization) VALUES ($1, $2) RETURNING id",
        [d.name, d.specialization],
      );
      const doctorId = inserted.rows[0].id;
      for (const key of d.services)
        await client.query(
          "INSERT INTO doctor_services (doctor_id, service_id) VALUES ($1, $2)",
          [doctorId, serviceIds[key]],
        );
      for (const day of d.days)
        await client.query(
          `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_interval_minutes)
           VALUES ($1, $2, $3, $4, 30)`,
          [doctorId, day, d.start, d.end],
        );
    }
    await client.query("COMMIT");
    console.log(
      `Data awal klinik terisi: ${SERVICES.length} layanan, ${DOCTORS.length} dokter contoh, dan jam praktiknya.`,
    );
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

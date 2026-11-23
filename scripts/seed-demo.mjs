// Janji temu contoh untuk mencoba papan jadwal, jadwal dokter, kontrol, dan
// rekap tanpa menunggu booking sungguhan.
//   npm run db:seed:demo            isi minggu ini (Senin–Minggu, zona klinik)
//   npm run db:seed:demo -- --hapus hapus semua data contoh
//
// Data contoh mudah dikenali dan dihapus: nomor HP pasien 08129999xxxx dan
// kode booking berawalan JK-D. Slot yang sudah terisi booking asli dilewati,
// dan bila minggu ini sudah berisi data contoh, tidak ada yang ditambahkan.
// Jalankan `npm run db:seed` lebih dulu agar layanan & dokter tersedia.
import { randomInt } from "node:crypto";
import { Pool } from "pg";
import { loadEnvironment } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";

const DEMO_PHONE = "08129999";
const NAMES = [
  "Sari Wulandari",
  "Andi Pratama",
  "Dewi Anggraini",
  "Rudi Hartono",
  "Lina Marlina",
  "Fajar Nugroho",
  "Yuni Kartika",
  "Bayu Saputra",
  "Rani Oktaviani",
  "Hendra Gunawan",
  "Putri Maharani",
  "Dimas Prasetyo",
  "Wulan Sari",
  "Eko Purnomo",
  "Citra Lestari",
  "Fikri Ramadhan",
  "Indah Permata",
  "Joko Susilo",
];
const NOTES = [
  "Karang gigi rahang bawah cukup tebal.",
  "Kawat atas dikencangkan, keluhan ngilu ringan.",
  "Tambalan geraham kiri bawah, sikat gigi lebih pelan.",
  "Gusi sedikit berdarah, disarankan kumur air garam.",
  "",
];
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function clinicToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}
function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function dayOfWeek(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMinutes = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const code = () =>
  `JK-D${Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

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

async function removeDemo() {
  const demoPatients = `SELECT id FROM patients WHERE phone LIKE '${DEMO_PHONE}%'`;
  await client.query(
    `DELETE FROM outbox_events WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id IN (${demoPatients}))`,
  );
  await client.query(
    `DELETE FROM follow_ups WHERE patient_id IN (${demoPatients})`,
  );
  const appointments = await client.query(
    `DELETE FROM appointments WHERE patient_id IN (${demoPatients})`,
  );
  const patients = await client.query(
    `DELETE FROM patients WHERE phone LIKE '${DEMO_PHONE}%'`,
  );
  return { appointments: appointments.rowCount, patients: patients.rowCount };
}

try {
  await client.query("BEGIN");
  if (process.argv.includes("--hapus")) {
    const removed = await removeDemo();
    await client.query("COMMIT");
    console.log(
      `Data contoh dihapus: ${removed.appointments} janji temu, ${removed.patients} pasien.`,
    );
  } else {
    const today = clinicToday();
    const monday = addDays(today, -((dayOfWeek(today) + 6) % 7));
    const sunday = addDays(monday, 6);
    const existing = await client.query(
      `SELECT count(*)::int AS n FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE p.phone LIKE '${DEMO_PHONE}%' AND a.appointment_date BETWEEN $1 AND $2`,
      [monday, sunday],
    );
    const doctors = await client.query(
      `SELECT d.id, d.name,
              coalesce(array_agg(DISTINCT ds.service_id) FILTER (WHERE ds.service_id IS NOT NULL), '{}') AS services
         FROM doctors d LEFT JOIN doctor_services ds ON ds.doctor_id = d.id
        WHERE d.is_active GROUP BY d.id ORDER BY d.name`,
    );
    if (existing.rows[0].n > 0) {
      await client.query("ROLLBACK");
      console.log(
        `Minggu ${monday}–${sunday} sudah berisi ${existing.rows[0].n} janji contoh. Tidak ada yang ditambahkan.`,
      );
    } else if (!doctors.rows.length) {
      await client.query("ROLLBACK");
      console.log("Belum ada dokter aktif. Jalankan npm run db:seed dulu.");
    } else {
      const services = await client.query(
        "SELECT id, default_follow_up_days FROM services",
      );
      const followUpDays = Object.fromEntries(
        services.rows.map((s) => [s.id, s.default_follow_up_days]),
      );
      let created = 0;
      let nameIndex = 0;
      for (let i = 0; i < 7; i++) {
        const date = addDays(monday, i);
        for (const doctor of doctors.rows) {
          if (!doctor.services.length) continue;
          const blocks = await client.query(
            `SELECT start_time::text AS start, end_time::text AS end, slot_interval_minutes AS step
               FROM doctor_schedules WHERE doctor_id = $1 AND day_of_week = $2 AND is_active`,
            [doctor.id, dayOfWeek(date)],
          );
          for (const block of blocks.rows) {
            const slots = [];
            for (
              let t = toMinutes(block.start);
              t + block.step <= toMinutes(block.end);
              t += block.step
            )
              slots.push(t);
            // Kira-kira separuh slot terisi agar papan jadwal terlihat wajar.
            const picked = slots.filter((_, index) => (index + i) % 2 === 0);
            for (const [n, start] of picked.entries()) {
              const name = NAMES[nameIndex % NAMES.length];
              const phone = `${DEMO_PHONE}${String(nameIndex % NAMES.length).padStart(4, "0")}`;
              nameIndex++;
              const serviceId = doctor.services[n % doctor.services.length];
              const past = date < today;
              const status = past
                ? n % 5 === 4
                  ? "no_show"
                  : "completed"
                : date === today && n < 2
                  ? "completed"
                  : "scheduled";
              const notes =
                status === "completed" ? NOTES[n % NOTES.length] : "";
              const patient = await client.query(
                `INSERT INTO patients (name, phone) VALUES ($1, $2)
                 ON CONFLICT (phone) DO UPDATE SET name = excluded.name RETURNING id`,
                [name, phone],
              );
              const inserted = await client.query(
                `INSERT INTO appointments
                   (code, patient_id, doctor_id, service_id, appointment_date, start_time, end_time,
                    status, notes, completed_at, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8::appointment_status, nullif($9::text, ''),
                         CASE WHEN $8::text = 'completed' THEN now() END, now() - interval '3 days')
                 ON CONFLICT DO NOTHING RETURNING id`,
                [
                  code(),
                  patient.rows[0].id,
                  doctor.id,
                  serviceId,
                  date,
                  fromMinutes(start),
                  fromMinutes(start + block.step),
                  status,
                  notes,
                ],
              );
              if (!inserted.rows.length) continue; // slot sudah dipakai booking asli
              created++;
              const days = followUpDays[serviceId];
              if (status === "completed" && days)
                await client.query(
                  `INSERT INTO follow_ups (patient_id, service_id, doctor_id, source_appointment_id, due_date, interval_days)
                   VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
                  [
                    patient.rows[0].id,
                    serviceId,
                    doctor.id,
                    inserted.rows[0].id,
                    addDays(date, days),
                    days,
                  ],
                );
            }
          }
        }
      }
      await client.query("COMMIT");
      console.log(
        `Data contoh terisi: ${created} janji temu untuk ${monday}–${sunday}. Hapus dengan npm run db:seed:demo -- --hapus.`,
      );
    }
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

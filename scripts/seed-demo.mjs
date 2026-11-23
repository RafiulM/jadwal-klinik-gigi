// Data contoh untuk mencoba papan jadwal, jadwal dokter, kontrol pasien, dan
// rekap tanpa menunggu booking sungguhan.
//   npm run db:seed:demo            isi beberapa minggu (lihat rentang di bawah)
//   npm run db:seed:demo -- --hapus hapus semua data contoh
//
// Rentang: DEMO_WEEKS_BACK minggu lalu (default 6) sampai DEMO_WEEKS_AHEAD
// minggu depan (default 2), Senin–Minggu, zona waktu klinik. Mengikuti jam
// praktik dokter aktif: kunjungan lampau selesai (dengan catatan) atau tidak
// datang, kunjungan mendatang menunggu, dan kunjungan selesai untuk layanan
// berinterval (mis. kontrol behel 30 hari) membuat jadwal kontrol.
//
// Aman diulang: hari yang sudah berisi data contoh dilewati, slot yang sudah
// dipakai booking asli tidak disentuh, dan tidak ada event outbox yang dibuat
// (n8n tidak mengirim pesan untuk data contoh). Data contoh dikenali dari HP
// pasien 08129999xxxx dan kode booking berawalan JK-D.
// Jalankan `npm run db:seed` lebih dulu agar layanan & dokter tersedia.
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { loadEnvironment } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";

const DEMO_PHONE = "08129999";
const WEEKS_BACK = Number(process.env.DEMO_WEEKS_BACK ?? 6);
const WEEKS_AHEAD = Number(process.env.DEMO_WEEKS_AHEAD ?? 2);

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
  "Nadia Safitri",
  "Agus Setiawan",
  "Maya Kusuma",
  "Rizky Firmansyah",
  "Ayu Lestari",
  "Bambang Wijaya",
  "Siti Rahmawati",
  "Teguh Santoso",
  "Melati Puspita",
  "Arif Hidayat",
  "Nur Aini",
  "Galih Saputra",
  "Intan Permatasari",
  "Yoga Pratama",
  "Laras Ayuningtyas",
  "Doni Kurniawan",
  "Fitri Handayani",
  "Reza Mahendra",
  "Tika Amalia",
  "Hadi Susanto",
  "Vina Melinda",
  "Ilham Akbar",
  "Desi Ratnasari",
  "Bagas Prakoso",
  "Ratna Sari",
  "Kevin Wijaya",
  "Anisa Rahma",
  "Fadli Ramadhan",
  "Mega Wulandari",
  "Satria Nugraha",
];

// Catatan dokter per jenis layanan (dicocokkan dari nama layanan).
const NOTES = {
  scaling: [
    "Karang gigi rahang bawah cukup tebal, sudah dibersihkan.",
    "Gusi sedikit berdarah saat dibersihkan, disarankan kumur air garam.",
    "Karang gigi tipis, kebersihan mulut baik.",
    "Ada noda kopi di gigi depan, disarankan sikat 2x sehari.",
  ],
  behel: [
    "Kawat atas dikencangkan, keluhan ngilu ringan.",
    "Karet behel diganti, gigi depan mulai rapi.",
    "Bracket kiri bawah lepas, sudah dipasang ulang.",
    "Pergerakan gigi sesuai rencana, lanjut kontrol bulan depan.",
  ],
  tambal: [
    "Tambalan geraham kiri bawah, hindari makan keras 2 jam.",
    "Lubang kecil di gigi depan ditambal resin komposit.",
    "Tambalan lama diganti, gigi tidak ngilu lagi.",
  ],
  periksa: [
    "Pemeriksaan rutin, ada lubang kecil di geraham, dijadwalkan tambal.",
    "Keluhan ngilu karena gigi sensitif, disarankan pasta khusus.",
    "Gigi bungsu mulai tumbuh miring, dipantau dulu.",
    "Tidak ada keluhan berarti, kebersihan mulut baik.",
  ],
};
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Angka 0–1 yang tetap untuk kunci yang sama: hasil seed bisa diulang. */
function chance(...parts) {
  const hash = createHash("sha256").update(parts.join("|")).digest();
  return hash.readUInt32BE(0) / 0xffffffff;
}
function pick(list, ...parts) {
  return list[Math.floor(chance(...parts) * list.length) % list.length];
}
function code(...parts) {
  const hash = createHash("sha256").update(parts.join("|")).digest();
  return `JK-D${Array.from({ length: 5 }, (_, i) => ALPHABET[hash[i] % ALPHABET.length]).join("")}`;
}
function notesFor(serviceName, ...parts) {
  const name = serviceName.toLowerCase();
  const key = name.includes("scaling")
    ? "scaling"
    : name.includes("behel")
      ? "behel"
      : name.includes("tambal")
        ? "tambal"
        : "periksa";
  return pick(NOTES[key], "note", ...parts);
}

function clinicNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
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

async function seed() {
  const now = clinicNow();
  const monday = addDays(now.date, -((dayOfWeek(now.date) + 6) % 7));
  const start = addDays(monday, -7 * WEEKS_BACK);
  const end = addDays(monday, 7 * (WEEKS_AHEAD + 1) - 1);

  const doctors = (
    await client.query(
      `SELECT d.id, d.name,
              coalesce(array_agg(ds.service_id ORDER BY s.position, s.name)
                FILTER (WHERE ds.service_id IS NOT NULL AND s.is_active), '{}') AS services
         FROM doctors d
         LEFT JOIN doctor_services ds ON ds.doctor_id = d.id
         LEFT JOIN services s ON s.id = ds.service_id
        WHERE d.is_active GROUP BY d.id ORDER BY d.name`,
    )
  ).rows.filter((d) => d.services.length);
  if (!doctors.length) return { reason: "no-doctors" };

  const services = Object.fromEntries(
    (
      await client.query(
        "SELECT id, name, default_follow_up_days FROM services",
      )
    ).rows.map((s) => [s.id, s]),
  );
  const filledDays = new Set(
    (
      await client.query(
        `SELECT DISTINCT a.appointment_date::text AS day FROM appointments a
           JOIN patients p ON p.id = a.patient_id
          WHERE p.phone LIKE '${DEMO_PHONE}%' AND a.appointment_date BETWEEN $1 AND $2`,
        [start, end],
      )
    ).rows.map((r) => r.day),
  );

  // Pasien contoh dibuat sekali, nomor HP tetap per nama.
  const patientIds = [];
  for (const [index, name] of NAMES.entries()) {
    const phone = `${DEMO_PHONE}${String(index).padStart(4, "0")}`;
    const row = await client.query(
      `INSERT INTO patients (name, phone) VALUES ($1, $2)
       ON CONFLICT (phone) DO UPDATE SET name = excluded.name RETURNING id`,
      [name, phone],
    );
    patientIds.push(row.rows[0].id);
  }

  let created = 0;
  let followUps = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (filledDays.has(date)) continue;
    const daysAway = Math.round(
      (Date.parse(date) - Date.parse(now.date)) / 86_400_000,
    );
    // Hari lampau dan minggu ini lebih padat; jauh ke depan makin longgar.
    const occupancy =
      daysAway < 0 ? 0.7 : daysAway <= 7 ? 0.55 : daysAway <= 14 ? 0.35 : 0.2;
    const usedPatients = new Set();
    for (const doctor of doctors) {
      const blocks = (
        await client.query(
          `SELECT start_time::text AS start, end_time::text AS end, slot_interval_minutes AS step
             FROM doctor_schedules WHERE doctor_id = $1 AND day_of_week = $2 AND is_active`,
          [doctor.id, dayOfWeek(date)],
        )
      ).rows;
      for (const block of blocks) {
        for (
          let slot = toMinutes(block.start);
          slot + block.step <= toMinutes(block.end);
          slot += block.step
        ) {
          if (chance(date, doctor.id, slot) > occupancy) continue;
          let patientIndex = Math.floor(
            chance("p", date, doctor.id, slot) * NAMES.length,
          );
          while (usedPatients.has(patientIndex))
            patientIndex = (patientIndex + 1) % NAMES.length;
          usedPatients.add(patientIndex);

          const serviceId = pick(doctor.services, "s", date, doctor.id, slot);
          const service = services[serviceId];
          const finished =
            date < now.date ||
            (date === now.date && slot + block.step <= now.minutes);
          const status = !finished
            ? "scheduled"
            : chance("st", date, doctor.id, slot) < 0.14
              ? "no_show"
              : "completed";
          const notes =
            status === "completed"
              ? notesFor(service.name, date, doctor.id, slot)
              : "";
          const bookedDaysBefore =
            1 + Math.floor(chance("c", date, doctor.id, slot) * 10);

          const inserted = await client.query(
            `INSERT INTO appointments
               (code, patient_id, doctor_id, service_id, appointment_date, start_time, end_time,
                status, notes, completed_at, status_changed_at, created_at)
             VALUES ($1, $2, $3, $4, $5::date, $6::time, $7::time, $8::text::appointment_status,
                     nullif($9::text, ''),
                     CASE WHEN $8::text = 'completed'
                       THEN ($5::date + $7::time) AT TIME ZONE 'Asia/Jakarta' END,
                     CASE WHEN $8::text <> 'scheduled'
                       THEN ($5::date + $7::time) AT TIME ZONE 'Asia/Jakarta' END,
                     LEAST(now(), ($5::date - $10::int + time '19:30') AT TIME ZONE 'Asia/Jakarta'))
             ON CONFLICT DO NOTHING RETURNING id`,
            [
              code(date, doctor.id, slot),
              patientIds[patientIndex],
              doctor.id,
              serviceId,
              date,
              fromMinutes(slot),
              fromMinutes(slot + block.step),
              status,
              notes,
              bookedDaysBefore,
            ],
          );
          if (!inserted.rows.length) continue; // slot dipakai booking asli
          created++;

          const interval = service.default_follow_up_days;
          if (status === "completed" && interval) {
            await client.query(
              `INSERT INTO follow_ups
                 (patient_id, service_id, doctor_id, source_appointment_id, due_date, interval_days)
               VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
              [
                patientIds[patientIndex],
                serviceId,
                doctor.id,
                inserted.rows[0].id,
                addDays(date, interval),
                interval,
              ],
            );
            followUps++;
          }
        }
      }
    }
  }

  // Kontrol yang pasiennya sudah punya janji berikutnya untuk layanan sama:
  // selesai → "done", masih menunggu → "booked".
  await client.query(
    `WITH next_visit AS (
       SELECT f.id AS follow_up_id, a.id AS appointment_id, a.status
         FROM follow_ups f
         JOIN appointments src ON src.id = f.source_appointment_id
         JOIN LATERAL (
           SELECT a2.id, a2.status FROM appointments a2
            WHERE a2.patient_id = f.patient_id AND a2.service_id = f.service_id
              AND a2.appointment_date > src.appointment_date AND a2.status <> 'no_show'
            ORDER BY a2.appointment_date LIMIT 1) a ON true
        WHERE f.status = 'pending'
          AND f.patient_id IN (SELECT id FROM patients WHERE phone LIKE '${DEMO_PHONE}%'))
     UPDATE follow_ups f
        SET status = CASE WHEN n.status = 'completed'
                       THEN 'done'::follow_up_status ELSE 'booked'::follow_up_status END,
            booked_appointment_id = n.appointment_id
       FROM next_visit n
      WHERE f.id = n.follow_up_id`,
  );
  return { created, followUps, start, end, skippedDays: filledDays.size };
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
    const result = await seed();
    await client.query("COMMIT");
    if (result.reason === "no-doctors")
      console.log("Belum ada dokter aktif. Jalankan npm run db:seed dulu.");
    else
      console.log(
        `Data contoh ${result.start}–${result.end}: ${result.created} janji temu baru, ${result.followUps} jadwal kontrol` +
          (result.skippedDays
            ? `; ${result.skippedDays} hari sudah berisi data contoh dan dilewati.`
            : ".") +
          " Hapus dengan npm run db:seed:demo -- --hapus.",
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

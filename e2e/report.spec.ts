import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";

// Rekap harian pemilik: angka dihitung dari janji temu di database dan bisa
// diunduh sebagai CSV.
const origin = "http://localhost:3101";
const headers = { Origin: origin };
const pool = new Pool({
  connectionString: process.env.STARTER_TEST_DATABASE_URL,
  max: 1,
});

function clinicDate(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

test.describe.configure({ mode: "serial" });
let client: APIRequestContext;
const day = clinicDate(-1);

test.beforeAll(async ({ playwright }) => {
  client = await playwright.request.newContext({ baseURL: origin });
  const data = {
    name: "Pemilik Uji",
    email: `pemilik-${randomUUID()}@example.com`,
    password: "Pemilik-test-password-123!",
  };
  let response = await client.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] || 10);
    await delay((Math.min(seconds, 10) + 0.1) * 1000);
    response = await client.post("/api/auth/sign-up/email", { headers, data });
  }
  expect(response.status()).toBe(200);
  await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [
    "pemilik",
    data.email,
  ]);

  const service = (
    await pool.query(
      "INSERT INTO services (name) VALUES ('Layanan rekap uji') RETURNING id",
    )
  ).rows[0].id;
  const doctor = (
    await pool.query(
      "INSERT INTO doctors (name) VALUES ('drg. Rekap, Uji') RETURNING id",
    )
  ).rows[0].id;
  const statuses = ["completed", "completed", "no_show", "scheduled"];
  for (const [i, status] of statuses.entries()) {
    const patient = (
      await pool.query(
        "INSERT INTO patients (name, phone) VALUES ($1, $2) RETURNING id",
        [`Pasien Rekap ${i}`, `08139999000${i}`],
      )
    ).rows[0].id;
    await pool.query(
      `INSERT INTO appointments (code, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text::appointment_status, CASE WHEN $8::text = 'completed' THEN now() END)`,
      [
        `JK-RKP00${i}`,
        patient,
        doctor,
        service,
        day,
        `${String(9 + i).padStart(2, "0")}:00`,
        `${String(9 + i).padStart(2, "0")}:30`,
        status,
      ],
    );
  }
});

test.afterAll(async () => {
  await client.dispose();
  await pool.end();
});

test("rekap harian menghitung status per dokter", async () => {
  const response = await client.get(`/api/reports/daily?date=${day}&days=3`);
  expect(response.status()).toBe(200);
  const report = (await response.json()).data;
  expect(report.date).toBe(day);
  expect(report.days).toHaveLength(3);
  const target = report.days[2];
  expect(target).toMatchObject({
    date: day,
    total: 4,
    completed: 2,
    noShow: 1,
    waiting: 1,
  });
  expect(target.doctors).toContainEqual(
    expect.objectContaining({ name: "drg. Rekap, Uji", total: 4 }),
  );
  expect(report.period).toContainEqual(
    expect.objectContaining({
      name: "drg. Rekap, Uji",
      days: 1,
      patients: 4,
      completed: 2,
    }),
  );
});

test("rekap bisa diunduh sebagai CSV", async () => {
  const response = await client.get(
    `/api/reports/export?date=${day}&jenis=hari`,
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["content-disposition"]).toContain(
    `rekap-klinik-${day}.csv`,
  );
  const text = (await response.text()).replace(/^\uFEFF/, "");
  const lines = text.split("\r\n");
  expect(lines[0]).toBe(
    "Tanggal,Dokter,Janji,Selesai,Tidak datang,Belum ditangani",
  );
  // Nama dengan koma dikutip agar kolom CSV tetap benar.
  expect(lines).toContain(`${day},"drg. Rekap, Uji",4,2,1,1`);
  expect(lines.at(-1)).toBe(`${day},Total,4,2,1,1`);

  const period = await client.get(
    `/api/reports/export?date=${day}&days=3&jenis=rentang`,
  );
  expect(period.status()).toBe(200);
  const rows = (await period.text()).replace(/^\uFEFF/, "").split("\r\n");
  expect(rows).toHaveLength(4);
});

import { Pool } from "pg";
import { expect, test } from "@playwright/test";

// API integrasi n8n: kunci bersama, outbox klaim/ack, pengingat, kontrol, rekap.
const origin = "http://localhost:3101";
const KEY = "e2e-n8n-integration-key-0123456789abcdef";
const auth = { Authorization: `Bearer ${KEY}` };
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

const ids = { service: "", doctor: "", followUp: "" };

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  ids.service = (
    await pool.query(
      "INSERT INTO services (name, default_follow_up_days) VALUES ('Layanan integrasi uji', 30) RETURNING id",
    )
  ).rows[0].id;
  ids.doctor = (
    await pool.query(
      "INSERT INTO doctors (name) VALUES ('drg. Integrasi') RETURNING id",
    )
  ).rows[0].id;
  await pool.query(
    "INSERT INTO doctor_services (doctor_id, service_id) VALUES ($1, $2)",
    [ids.doctor, ids.service],
  );
  for (let day = 0; day < 7; day++)
    await pool.query(
      "INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, '09:00', '12:00')",
      [ids.doctor, day],
    );
});

test.afterAll(async () => {
  await pool.end();
});

test("tanpa kunci yang benar ditolak", async ({ request }) => {
  expect((await request.get("/api/integrations/n8n/ping")).status()).toBe(401);
  const wrong = await request.get("/api/integrations/n8n/ping", {
    headers: { Authorization: "Bearer kunci-salah" },
  });
  expect(wrong.status()).toBe(401);
  const ok = await request.get("/api/integrations/n8n/ping", {
    headers: { "X-API-Key": KEY },
  });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).data.ok).toBe(true);
});

test("booking baru masuk outbox, diklaim sekali, lalu di-ack", async ({
  request,
}) => {
  const booked = await request.post("/api/booking", {
    headers: { Origin: origin },
    data: {
      serviceId: ids.service,
      doctorId: ids.doctor,
      date: clinicDate(1),
      time: "09:00",
      name: "Pasien Integrasi",
      phone: "081377770099",
    },
  });
  expect(booked.status()).toBe(201);
  const code = (await booked.json()).data.code;

  const claim = await request.post("/api/integrations/n8n/outbox/claim", {
    headers: auth,
    data: { limit: 50 },
  });
  expect(claim.status()).toBe(200);
  const events = (await claim.json()).data;
  const event = events.find(
    (e: { payload: { code?: string } }) => e.payload.code === code,
  );
  expect(event).toMatchObject({
    eventType: "appointment_created",
    attempts: 1,
    payload: {
      patientName: "Pasien Integrasi",
      patientPhone: "081377770099",
      proofUrl: `${origin}/janji/${code}`,
    },
  });

  // Sedang dikunci: klaim berikutnya tidak mengambil event yang sama.
  const again = (
    await (
      await request.post("/api/integrations/n8n/outbox/claim", {
        headers: auth,
      })
    ).json()
  ).data;
  expect(again.map((e: { id: string }) => e.id)).not.toContain(event.id);

  const ack = await request.post(
    `/api/integrations/n8n/outbox/${event.id}/ack`,
    { headers: auth, data: { result: "sent" } },
  );
  expect(ack.status()).toBe(200);
  expect((await ack.json()).data.status).toBe("sent");
  const twice = await request.post(
    `/api/integrations/n8n/outbox/${event.id}/ack`,
    { headers: auth, data: { result: "sent" } },
  );
  expect(twice.status()).toBe(409);
});

test("pengingat H-1, kontrol jatuh tempo, dan rekap harian", async ({
  request,
}) => {
  const reminders = (
    await (
      await request.get(
        `/api/integrations/n8n/reminders?date=${clinicDate(1)}`,
        { headers: auth },
      )
    ).json()
  ).data;
  expect(reminders.appointments).toContainEqual(
    expect.objectContaining({
      patientName: "Pasien Integrasi",
      startTime: "09:00",
      doctorName: "drg. Integrasi",
    }),
  );

  // Kontrol yang sudah lewat tempo dan belum dibooking.
  const patient = (
    await pool.query(
      "INSERT INTO patients (name, phone) VALUES ('Pasien Kontrol Integrasi', '081377770098') RETURNING id",
    )
  ).rows[0].id;
  ids.followUp = (
    await pool.query(
      "INSERT INTO follow_ups (patient_id, service_id, doctor_id, due_date) VALUES ($1, $2, $3, $4) RETURNING id",
      [patient, ids.service, ids.doctor, clinicDate(-2)],
    )
  ).rows[0].id;
  const due = (
    await (
      await request.get("/api/integrations/n8n/follow-ups/due", {
        headers: auth,
      })
    ).json()
  ).data;
  expect(
    due.followUps.map((f: { followUpId: string }) => f.followUpId),
  ).toContain(ids.followUp);
  const reminded = await request.post(
    `/api/integrations/n8n/follow-ups/${ids.followUp}/reminded`,
    { headers: auth },
  );
  expect(reminded.status()).toBe(200);
  expect((await reminded.json()).data.reminderCount).toBe(1);
  // Baru diingatkan: tidak muncul lagi sampai 7 hari kemudian.
  const after = (
    await (
      await request.get("/api/integrations/n8n/follow-ups/due", {
        headers: auth,
      })
    ).json()
  ).data;
  expect(
    after.followUps.map((f: { followUpId: string }) => f.followUpId),
  ).not.toContain(ids.followUp);

  const recap = await request.get(
    `/api/integrations/n8n/reports/daily?date=${clinicDate(1)}`,
    { headers: auth },
  );
  expect(recap.status()).toBe(200);
  const data = (await recap.json()).data;
  expect(data.total).toBeGreaterThanOrEqual(1);
  expect(data.text).toContain("Janji temu:");
});

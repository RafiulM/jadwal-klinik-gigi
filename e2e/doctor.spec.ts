import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";

// Jadwal dokter, tanda selesai + tanggal kontrol, dan daftar kontrol diuji
// lewat API asli dengan PostgreSQL sekali pakai.
const origin = "http://localhost:3101";
const headers = { Origin: origin };

const pool = new Pool({
  connectionString: process.env.STARTER_TEST_DATABASE_URL,
  max: 2,
});

function clinicDate(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const ids = {
  service: "",
  doctorA: "",
  doctorB: "",
  patient: "",
  todayA: "",
  futureA: "",
  todayB: "",
};
const patientPhone = "081377770001";

test.beforeAll(async () => {
  ids.service = (
    await pool.query(
      "INSERT INTO services (name, default_follow_up_days) VALUES ('Kontrol behel uji', 30) RETURNING id",
    )
  ).rows[0].id;
  ids.doctorA = (
    await pool.query(
      "INSERT INTO doctors (name) VALUES ('drg. Dokter A') RETURNING id",
    )
  ).rows[0].id;
  ids.doctorB = (
    await pool.query(
      "INSERT INTO doctors (name) VALUES ('drg. Dokter B') RETURNING id",
    )
  ).rows[0].id;
  await pool.query(
    "INSERT INTO doctor_services (doctor_id, service_id) VALUES ($1, $2)",
    [ids.doctorA, ids.service],
  );
  for (let day = 0; day < 7; day++)
    await pool.query(
      "INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, '09:00', '12:00')",
      [ids.doctorA, day],
    );
  ids.patient = (
    await pool.query(
      "INSERT INTO patients (name, phone) VALUES ('Pasien Kontrol', $1) RETURNING id",
      [patientPhone],
    )
  ).rows[0].id;
  const insert = (code: string, doctor: string, date: string) =>
    pool
      .query(
        "INSERT INTO appointments (code, patient_id, doctor_id, service_id, appointment_date, start_time, end_time) VALUES ($1, $2, $3, $4, $5, '09:00', '09:30') RETURNING id",
        [code, ids.patient, doctor, ids.service, date],
      )
      .then((result) => result.rows[0].id as string);
  ids.todayA = await insert("JK-DKA001", ids.doctorA, clinicDate(0));
  ids.futureA = await insert("JK-DKA002", ids.doctorA, clinicDate(3));
  ids.todayB = await insert("JK-DKB001", ids.doctorB, clinicDate(0));
});

test.afterAll(async () => {
  await pool.end();
});

async function signUp(client: APIRequestContext) {
  const data = {
    name: "Staf Uji",
    email: `dokter-${randomUUID()}@example.com`,
    password: "Dokter-test-password-123!",
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
  return data.email;
}

async function linkDoctor(email: string, doctorId: string) {
  const { rowCount } = await pool.query(
    'UPDATE doctors SET user_id = (SELECT id FROM "user" WHERE email = $1) WHERE id = $2',
    [email, doctorId],
  );
  expect(rowCount).toBe(1);
}

test("dokter hanya melihat dan mengubah janji temunya sendiri", async ({
  request,
}) => {
  const email = await signUp(request);

  const before = await request.get("/api/doctor/today");
  expect(before.status()).toBe(403);
  expect((await before.json()).error.code).toBe("NOT_A_DOCTOR");
  expect((await request.get("/api/follow-ups")).status()).toBe(403);

  await linkDoctor(email, ids.doctorA);
  const today = await request.get("/api/doctor/today");
  expect(today.status()).toBe(200);
  const day = (await today.json()).data;
  expect(day.date).toBe(clinicDate(0));
  expect(day.appointments.map((a: { id: string }) => a.id)).toEqual([
    ids.todayA,
  ]);
  expect(day.appointments[0].patient.phone).not.toContain("7777");
  expect(day.appointments[0].service.suggestedFollowUpDate).toBe(
    clinicDate(30),
  );

  const other = await request.patch(`/api/doctor/appointments/${ids.todayB}`, {
    headers,
    data: { status: "completed" },
  });
  expect(other.status()).toBe(404);

  const future = await request.patch(
    `/api/doctor/appointments/${ids.futureA}`,
    { headers, data: { status: "completed" } },
  );
  expect(future.status()).toBe(409);
  expect((await future.json()).error.code).toBe("NOT_STARTED");

  const foreign = await request.patch(
    `/api/doctor/appointments/${ids.todayA}`,
    {
      headers: { Origin: "https://evil.example" },
      data: { status: "completed" },
    },
  );
  expect(foreign.status()).toBe(403);
});

test("tandai selesai dengan kontrol, lalu booking kontrol mengubah statusnya", async ({
  request,
}) => {
  const email = await signUp(request);
  await pool.query("UPDATE doctors SET user_id = NULL WHERE id = $1", [
    ids.doctorA,
  ]);
  await linkDoctor(email, ids.doctorA);

  const dueDate = clinicDate(30);
  const done = await request.patch(`/api/doctor/appointments/${ids.todayA}`, {
    headers,
    data: {
      status: "completed",
      notes: " Kawat dikencangkan. ",
      followUpDate: dueDate,
    },
  });
  expect(done.status()).toBe(200);
  const appointment = (await done.json()).data;
  expect(appointment).toMatchObject({
    status: "completed",
    notes: "Kawat dikencangkan.",
    followUpDate: dueDate,
    followUpStatus: "pending",
  });

  const tooLate = await request.patch(
    `/api/doctor/appointments/${ids.todayA}`,
    { headers, data: { followUpDate: clinicDate(800) } },
  );
  expect(tooLate.status()).toBe(422);

  const list = (await (await request.get("/api/follow-ups")).json()).data;
  const followUp = list.followUps.find(
    (f: { sourceVisitId: string }) => f.sourceVisitId === ids.todayA,
  );
  expect(followUp).toMatchObject({
    dueDate,
    status: "pending",
    sourceVisitDate: clinicDate(0),
    patient: { phone: patientPhone },
  });

  const history = await request.get(`/api/patients/${ids.patient}/history`);
  expect(history.status()).toBe(200);
  const visits = (await history.json()).data.visits;
  expect(visits).toContainEqual(
    expect.objectContaining({
      id: ids.todayA,
      status: "completed",
      followUpDate: dueDate,
    }),
  );

  // Pasien booking layanan yang sama → kontrol menjadi "booked".
  const booked = await request.post("/api/booking", {
    headers,
    data: {
      serviceId: ids.service,
      doctorId: ids.doctorA,
      date: clinicDate(5),
      time: "10:00",
      name: "Pasien Kontrol",
      phone: patientPhone,
    },
  });
  expect(booked.status()).toBe(201);
  const after = await pool.query(
    "SELECT status, booked_appointment_id FROM follow_ups WHERE source_appointment_id = $1",
    [ids.todayA],
  );
  expect(after.rows[0].status).toBe("booked");
  expect(after.rows[0].booked_appointment_id).not.toBeNull();

  // Kontrol yang sudah dibooking tidak bisa diubah dari kunjungan asalnya.
  const locked = await request.patch(`/api/doctor/appointments/${ids.todayA}`, {
    headers,
    data: { followUpDate: null },
  });
  expect(locked.status()).toBe(409);
  expect((await locked.json()).error.code).toBe("FOLLOW_UP_LOCKED");
});

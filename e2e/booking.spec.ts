import { expect, test } from "@playwright/test";
import { Pool } from "pg";

// Booking publik (tanpa akun) diuji lewat API asli dan PostgreSQL sekali pakai.
const origin = "http://localhost:3101";
const headers = { Origin: origin };

const pool = new Pool({
  connectionString: process.env.STARTER_TEST_DATABASE_URL,
  max: 2,
});

let serviceId = "";
let inactiveServiceId = "";
let doctorId = "";

// Tanggal di masa depan (zona waktu klinik) supaya slot tidak pernah "lewat".
function futureDate(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

test.beforeAll(async () => {
  const service = await pool.query(
    "INSERT INTO services (name, description, default_follow_up_days) VALUES ('Scaling uji', 'Uji', 180) RETURNING id",
  );
  serviceId = service.rows[0].id;
  const inactive = await pool.query(
    "INSERT INTO services (name, is_active) VALUES ('Layanan nonaktif', false) RETURNING id",
  );
  inactiveServiceId = inactive.rows[0].id;
  const doctor = await pool.query(
    "INSERT INTO doctors (name, specialization) VALUES ('drg. Uji', 'Umum') RETURNING id",
  );
  doctorId = doctor.rows[0].id;
  await pool.query(
    "INSERT INTO doctor_services (doctor_id, service_id) VALUES ($1, $2), ($1, $3)",
    [doctorId, serviceId, inactiveServiceId],
  );
  for (let day = 0; day < 7; day++)
    await pool.query(
      "INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, '09:00', '12:00')",
      [doctorId, day],
    );
});

test.afterAll(async () => {
  await pool.end();
});

function booking(overrides: Record<string, unknown> = {}) {
  return {
    serviceId,
    doctorId,
    date: futureDate(7),
    time: "09:00",
    name: "Pasien Uji",
    phone: "+62 812-3456-7000",
    ...overrides,
  };
}

test("lists only active services and the doctors who provide them", async ({
  request,
}) => {
  const services = await request.get("/api/booking/services");
  expect(services.status()).toBe(200);
  expect(services.headers()["cache-control"]).toContain("no-store");
  const names = (await services.json()).data.map(
    (s: { name: string }) => s.name,
  );
  expect(names).toContain("Scaling uji");
  expect(names).not.toContain("Layanan nonaktif");

  const doctors = await request.get(
    `/api/booking/doctors?serviceId=${serviceId}`,
  );
  const { data } = await doctors.json();
  expect(data).toHaveLength(1);
  expect(data[0].schedules[0]).toMatchObject({
    startTime: "09:00",
    endTime: "12:00",
  });

  const inactive = await request.get(
    `/api/booking/doctors?serviceId=${inactiveServiceId}`,
  );
  expect((await inactive.json()).data).toEqual([]);
  expect(
    (await request.get("/api/booking/doctors?serviceId=nope")).status(),
  ).toBe(422);
});

test("saves a booking, marks the slot taken, and writes an outbox event", async ({
  request,
}) => {
  const created = await request.post("/api/booking", {
    headers,
    data: booking({ time: "10:00" }),
  });
  expect(created.status()).toBe(201);
  const { data } = await created.json();
  expect(data.code).toMatch(/^JK-[A-Z2-9]{6}$/);
  expect(data).toMatchObject({
    time: "10:00",
    endTime: "10:30",
    patientPhone: "081234567000",
  });

  const availability = await request.get(
    `/api/booking/availability?doctorId=${doctorId}&from=${futureDate(7)}&days=1`,
  );
  const slots = (await availability.json()).data.days[0].slots;
  expect(slots.find((s: { time: string }) => s.time === "10:00").status).toBe(
    "taken",
  );

  const events = await pool.query(
    "SELECT event_type, status FROM outbox_events WHERE payload->>'code' = $1",
    [data.code],
  );
  expect(events.rows).toEqual([
    { event_type: "appointment_created", status: "pending" },
  ]);

  const detail = await request.get(`/api/booking/${data.code.toLowerCase()}`);
  expect(detail.status()).toBe(200);
  expect((await detail.json()).data).toMatchObject({
    code: data.code,
    status: "scheduled",
    patientPhone: "0812••••7000",
  });
  expect((await request.get("/api/booking/JK-AAAAAA")).status()).toBe(404);
});

test("only one of two simultaneous bookings for a slot succeeds", async ({
  request,
}) => {
  const [first, second] = await Promise.all([
    request.post("/api/booking", {
      headers,
      data: booking({ time: "11:00", phone: "081200001111" }),
    }),
    request.post("/api/booking", {
      headers,
      data: booking({ time: "11:00", phone: "081200002222" }),
    }),
  ]);
  expect([first.status(), second.status()].sort()).toEqual([201, 409]);
  const loser = first.status() === 409 ? first : second;
  expect((await loser.json()).error.code).toBe("SLOT_TAKEN");
});

test("rejects foreign origins, unknown fields, off-grid and past slots", async ({
  request,
}) => {
  const foreign = await request.post("/api/booking", {
    headers: { Origin: "https://evil.example" },
    data: booking({ time: "09:30" }),
  });
  expect(foreign.status()).toBe(403);

  const extra = await request.post("/api/booking", {
    headers,
    data: { ...booking({ time: "09:30" }), status: "completed" },
  });
  expect(extra.status()).toBe(422);

  const offGrid = await request.post("/api/booking", {
    headers,
    data: booking({ time: "09:15" }),
  });
  expect((await offGrid.json()).error.code).toBe("SLOT_INVALID");

  const past = await request.post("/api/booking", {
    headers,
    data: booking({ date: futureDate(-1) }),
  });
  expect((await past.json()).error.code).toBe("SLOT_PAST");
});

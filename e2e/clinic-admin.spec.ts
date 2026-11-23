import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";

// Kelola klinik & papan jadwal: hanya admin, dan perubahan langsung terlihat
// di API booking publik.
const origin = "http://localhost:3101";
const headers = { Origin: origin };

const pool = new Pool({
  connectionString: process.env.STARTER_TEST_DATABASE_URL,
  max: 2,
});

// Satu akun untuk seluruh file (batas laju pendaftaran Better Auth).
test.describe.configure({ mode: "serial" });
let client: APIRequestContext;
let email = "";

test.beforeAll(async ({ playwright }) => {
  client = await playwright.request.newContext({ baseURL: origin });
  email = await signUp(client);
});

test.afterAll(async () => {
  await client.dispose();
  await pool.end();
});

async function signUp(client: APIRequestContext) {
  const data = {
    name: "Staf Kelola",
    email: `kelola-${randomUUID()}@example.com`,
    password: "Kelola-test-password-123!",
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

function clinicDate(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

test("endpoint admin menolak tamu dan akun biasa", async ({ request }) => {
  for (const url of [
    "/api/admin/services",
    "/api/admin/doctors",
    "/api/schedule",
  ])
    expect((await request.get(url)).status()).toBe(401);
  for (const url of [
    "/api/admin/services",
    "/api/admin/doctors",
    "/api/schedule",
  ])
    expect((await client.get(url)).status()).toBe(403);
  const create = await client.post("/api/admin/services", {
    headers,
    data: { name: "Tidak boleh", durationMinutes: 30 },
  });
  expect(create.status()).toBe(403);
});

test("admin mengatur layanan, dokter, dan jam praktik yang dipakai booking", async () => {
  await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [
    "admin",
    email,
  ]);
  const adminEmail = email;
  const request = client;

  const service = await request.post("/api/admin/services", {
    headers,
    data: { name: "Pemutihan uji", durationMinutes: 60, followUpDays: 365 },
  });
  expect(service.status()).toBe(201);
  const serviceId = (await service.json()).data.id as string;
  const duplicate = await request.post("/api/admin/services", {
    headers,
    data: { name: "PEMUTIHAN UJI", durationMinutes: 30 },
  });
  expect(duplicate.status()).toBe(409);

  const unknownAccount = await request.post("/api/admin/doctors", {
    headers,
    data: {
      name: "drg. Tanpa Akun",
      accountEmail: "belum-daftar@example.com",
      serviceIds: [serviceId],
    },
  });
  expect(unknownAccount.status()).toBe(422);

  const doctor = await request.post("/api/admin/doctors", {
    headers,
    data: {
      name: "drg. Kelola Uji",
      phone: "+62 812-1111-2222",
      accountEmail: adminEmail,
      serviceIds: [serviceId],
    },
  });
  expect(doctor.status()).toBe(201);
  const created = (await doctor.json()).data;
  expect(created).toMatchObject({
    phone: "081211112222",
    accountEmail: adminEmail,
    serviceIds: [serviceId],
    isActive: true,
  });

  // Dokter baru belum punya jam praktik → tidak ada slot.
  const before = await request.get(
    `/api/booking/availability?doctorId=${created.id}&serviceId=${serviceId}&from=${clinicDate(1)}&days=7`,
  );
  expect(
    (await before.json()).data.days.flatMap(
      (d: { slots: unknown[] }) => d.slots,
    ),
  ).toHaveLength(0);

  const days = [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
    dayOfWeek,
    open: true,
    start: "09:00",
    end: "10:30",
  }));
  const saved = await request.put(`/api/admin/doctors/${created.id}/schedule`, {
    headers,
    data: { slotIntervalMinutes: 45, days },
  });
  expect(saved.status()).toBe(200);
  expect((await saved.json()).data.outsideHours).toBe(0);

  const after = await request.get(
    `/api/booking/availability?doctorId=${created.id}&serviceId=${serviceId}&from=${clinicDate(1)}&days=1`,
  );
  expect(
    (await after.json()).data.days[0].slots.map(
      (s: { time: string }) => s.time,
    ),
  ).toEqual(["09:00", "09:45"]);

  const publicServices = async () =>
    (await (await request.get("/api/booking/services")).json()).data.map(
      (s: { id: string }) => s.id,
    );
  expect(await publicServices()).toContain(serviceId);
  const hidden = await request.patch(`/api/admin/services/${serviceId}`, {
    headers,
    data: { isActive: false },
  });
  expect(hidden.status()).toBe(200);
  expect(await publicServices()).not.toContain(serviceId);

  // Papan jadwal ikut melihat dokter baru dengan hari praktiknya.
  const week = (await (await request.get("/api/schedule")).json()).data;
  expect(
    week.doctors.find((d: { id: string }) => d.id === created.id).practiceDays,
  ).toEqual([0, 1, 2, 3, 4, 5, 6]);

  const removed = await request.delete(`/api/admin/doctors/${created.id}`, {
    headers,
  });
  expect(removed.status()).toBe(204);
});

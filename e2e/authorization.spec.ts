import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";

// Matriks otorisasi API per peran staf. Peran diberi di luar aplikasi
// (seperti npm run role:set); pendaftaran tidak pernah bisa mengatur peran.
const origin = "http://localhost:3101";
const headers = { Origin: origin };
const pool = new Pool({
  connectionString: process.env.STARTER_TEST_DATABASE_URL,
  max: 1,
});

test.describe.configure({ mode: "serial" });
let client: APIRequestContext;
let email = "";

test.beforeAll(async ({ playwright }) => {
  client = await playwright.request.newContext({ baseURL: origin });
  const data = {
    name: "Staf Matriks",
    email: `matriks-${randomUUID()}@example.com`,
    password: "Matriks-test-password-123!",
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
  email = data.email;
});

test.afterAll(async () => {
  await client.dispose();
  await pool.end();
});

const ENDPOINTS = [
  "/api/follow-ups",
  "/api/schedule",
  "/api/admin/services",
  "/api/admin/doctors",
  "/api/reports/daily",
];

// Status yang diharapkan per peran, urut sesuai ENDPOINTS. Rekap harian
// hanya untuk pemilik, termasuk tidak untuk admin.
const MATRIX: [string | null, number[]][] = [
  [null, [403, 403, 403, 403, 403]],
  ["dokter", [200, 403, 403, 403, 403]],
  ["admin", [200, 200, 200, 200, 403]],
  ["pemilik", [403, 200, 403, 403, 200]],
  ["admin,pemilik", [200, 200, 200, 200, 200]],
];

for (const [role, expected] of MATRIX)
  test(`peran ${role ?? "(tanpa peran)"} hanya mencapai API yang diizinkan`, async () => {
    await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [
      role,
      email,
    ]);
    const actual = [];
    for (const url of ENDPOINTS) actual.push((await client.get(url)).status());
    expect(actual).toEqual(expected);
  });

test("jadwal dokter hanya untuk akun yang ditautkan ke data dokter", async () => {
  await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [
    "admin,pemilik",
    email,
  ]);
  const response = await client.get("/api/doctor/today");
  expect(response.status()).toBe(403);
  expect((await response.json()).error.code).toBe("NOT_A_DOCTOR");
});

test("peran tidak bisa diatur lewat pendaftaran", async ({ request }) => {
  const response = await request.post("/api/auth/sign-up/email", {
    headers,
    data: {
      name: "Penyusup",
      email: `penyusup-${randomUUID()}@example.com`,
      password: "Penyusup-test-password-123!",
      role: "admin",
    },
  });
  if (response.status() === 200) {
    const { rows } = await pool.query(
      'SELECT role FROM "user" WHERE name = $1 ORDER BY created_at DESC LIMIT 1',
      ["Penyusup"],
    );
    expect(rows[0].role).not.toContain("admin");
  } else expect([400, 422, 429]).toContain(response.status());
});

test("tamu tanpa sesi mendapat 401 di semua API staf", async ({ request }) => {
  for (const url of [...ENDPOINTS, "/api/doctor/today", "/api/staff/me"])
    expect((await request.get(url)).status()).toBe(401);
});

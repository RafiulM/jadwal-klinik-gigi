import { expect, test } from "@playwright/test";

test("tamu tidak bisa membuka area staf", async ({ page, request }) => {
  await page.goto("/dokter");
  await expect(page).toHaveURL(/\/masuk$/);
  await expect(
    page.getByRole("heading", { name: "Masuk ke area staf" }),
  ).toBeVisible();
  // Alamat lama template diarahkan ke halaman masuk staf.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/masuk$/);
  // Halaman utama adalah booking publik: pasien tidak perlu akun.
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Buat janji temu dalam 2 menit" }),
  ).toBeVisible();
  const session = await request.get("/api/auth/get-session");
  expect(await session.json()).toBeNull();
});

test("daftar, sesi tersimpan, keluar, sandi salah, lalu masuk lagi", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `staf-${Date.now()}@example.com`;
  const password = "A-long-test-password-123!";
  await page.goto("/sign-up");
  await page.getByLabel("Nama", { exact: true }).fill("Staf Baru");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  // Akun baru belum punya peran staf sampai admin memberi akses.
  await expect(page).toHaveURL(/\/tanpa-akses$/);
  await expect(
    page.getByRole("button", { name: "Keluar", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/tanpa-akses$/);
  // Booking publik tetap bisa dibuka staf yang sedang masuk.
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  const cookies = await context.cookies();
  expect(
    cookies.some(
      (cookie) => cookie.name.includes("session_token") && cookie.httpOnly,
    ),
  ).toBe(true);
  await page.goto("/masuk");
  await expect(page).toHaveURL(/\/tanpa-akses$/);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/masuk\?keluar=1$/);
  await expect(
    page.getByText("Anda sudah keluar dari area staf."),
  ).toBeVisible();
  await page.goto("/dokter");
  await expect(page).toHaveURL(/\/masuk$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill("sandi-yang-salah");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Email atau kata sandi salah",
  );
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/tanpa-akses$/);
  expect(errors).toEqual([]);
});

test("auth rejects cross-origin requests and invalid signup data", async ({
  request,
}) => {
  const crossOrigin = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: "https://untrusted.example" },
    data: {
      name: "Test",
      email: "cross-origin@example.com",
      password: "Test-password-123",
    },
  });
  expect(crossOrigin.status()).toBe(403);
  const invalid = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: "http://localhost:3101" },
    data: { name: "Test", email: "not-an-email", password: "short" },
  });
  expect(invalid.status()).toBeGreaterThanOrEqual(400);
  expect(invalid.status()).toBeLessThan(500);
});

test("halaman masuk dan daftar muat di layar sempit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/masuk");
  await expect(
    page.getByRole("heading", { name: "Masuk ke area staf" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Buat akun staf", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

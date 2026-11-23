// Membaca kode galat PostgreSQL dari error Drizzle/node-postgres (bisa
// terbungkus di `cause`). Pesan dan nilai galat tidak pernah dikirim ke klien.

function pgErrors(error: unknown) {
  const found: { code?: string; constraint?: string }[] = [];
  for (
    let e: unknown = error;
    e && typeof e === "object";
    e = (e as { cause?: unknown }).cause
  )
    found.push(e as { code?: string; constraint?: string });
  return found;
}

/** Nama constraint bila galatnya unique violation (23505), selain itu null. */
export function uniqueViolation(error: unknown): string | null {
  const pg = pgErrors(error).find((e) => e.code === "23505");
  return pg ? (pg.constraint ?? "") : null;
}

/** Nama constraint bila galatnya foreign key violation (23503), selain itu null. */
export function foreignKeyViolation(error: unknown): string | null {
  const pg = pgErrors(error).find((e) => e.code === "23503");
  return pg ? (pg.constraint ?? "") : null;
}
